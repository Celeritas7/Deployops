// DeployOps — Word (.docx) export for QC worksheets.
// Builds real OOXML (word/document.xml) packaged with JSZip so the download
// is a genuine .docx: opens in Word / Google Docs and passes upload
// validation (the old .doc was an HTML envelope many services reject).
// Mirrors the on-screen worksheet: tier tints, group bands, gate boxes.
// Depends on globals from index.html: tr, pickField, wsTier, wsSplitGroup,
// phaseLabel, PHASE_META, WS_PHASE_TITLES_EN, wsCode, wsTodayISO, toast,
// wsWordTheme, wsWordDensity, JSZip.
(function () {
  const DX = pt => Math.round(pt * 20);            // pt -> twentieths (dxa)
  const B8 = pt => Math.max(2, Math.round(pt * 8)); // pt -> eighths (border sz)
  const HX = c => String(c || '000000').replace('#', '').toUpperCase();
  const XE = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');

  function run(t, o = {}) {
    const pr = [];
    if (o.font) pr.push(`<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>`);
    if (o.b) pr.push('<w:b/>');
    if (o.i) pr.push('<w:i/>');
    if (o.color) pr.push(`<w:color w:val="${HX(o.color)}"/>`);
    if (o.fill) pr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${HX(o.fill)}"/>`);
    if (o.sz) pr.push(`<w:sz w:val="${Math.round(o.sz * 2)}"/><w:szCs w:val="${Math.round(o.sz * 2)}"/>`);
    if (o.spc) pr.push(`<w:spacing w:val="${o.spc}"/>`);
    return `<w:r>${pr.length ? '<w:rPr>' + pr.join('') + '</w:rPr>' : ''}<w:t xml:space="preserve">${XE(t)}</w:t></w:r>`;
  }
  function p(runs, o = {}) {
    const pr = [`<w:spacing w:before="${o.before || 0}" w:after="${o.after || 0}"/>`];
    if (o.pbdr) pr.push(`<w:pBdr><w:bottom w:val="single" w:sz="${B8(o.pbdr.pt)}" w:space="1" w:color="${HX(o.pbdr.color)}"/></w:pBdr>`);
    if (o.jc) pr.push(`<w:jc w:val="${o.jc}"/>`);
    return `<w:p><w:pPr>${pr.join('')}</w:pPr>${Array.isArray(runs) ? runs.join('') : (runs || '')}</w:p>`;
  }
  const bd = (name, pt, color) => `<w:${name} w:val="single" w:sz="${B8(pt)}" w:space="0" w:color="${HX(color)}"/>`;
  function tc(content, o = {}) {
    const pr = [];
    if (o.w) pr.push(`<w:tcW w:w="${o.w}" w:type="dxa"/>`);
    if (o.span) pr.push(`<w:gridSpan w:val="${o.span}"/>`);
    if (o.bdr) pr.push(`<w:tcBorders>${o.bdr}</w:tcBorders>`);
    if (o.fill) pr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${HX(o.fill)}"/>`);
    const m = o.mar || {};
    pr.push(`<w:tcMar><w:top w:w="${m.t != null ? m.t : 40}" w:type="dxa"/><w:left w:w="${m.l != null ? m.l : 120}" w:type="dxa"/><w:bottom w:w="${m.b != null ? m.b : 40}" w:type="dxa"/><w:right w:w="${m.r != null ? m.r : 120}" w:type="dxa"/></w:tcMar>`);
    pr.push(`<w:vAlign w:val="${o.va || 'center'}"/>`);
    return `<w:tc><w:tcPr>${pr.join('')}</w:tcPr>${content}</w:tc>`;
  }
  const trow = cells => `<w:tr>${cells}</w:tr>`;
  function tbl(rows, cols, o = {}) {
    const pr = [`<w:tblW w:w="${cols.reduce((a, c) => a + c, 0)}" w:type="dxa"/>`];
    if (o.bdr) pr.push(`<w:tblBorders>${o.bdr}</w:tblBorders>`);
    pr.push('<w:tblLayout w:type="fixed"/>');
    return `<w:tbl><w:tblPr>${pr.join('')}</w:tblPr><w:tblGrid>${cols.map(c => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`;
  }
  const spacer = after => `<w:p><w:pPr><w:spacing w:before="0" w:after="${after || 120}"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>`;

  const CONTENT_W = 10200; // A4 minus margins, in dxa

  function sectionXml(model, unitName, section, lang, style, T, P) {
    const word = style === 'word';
    const F = word ? 'Calibri' : 'IBM Plex Sans';
    const FM = word ? 'Calibri' : 'Consolas';
    const FD = word ? 'Times New Roman' : F;
    const CW = [DX(T.cw[0]), DX(T.cw[1]), 0, DX(T.cw[3]), DX(T.cw[4])];
    CW[2] = CONTENT_W - CW[0] - CW[1] - CW[3] - CW[4];
    const hair = word ? { pt: 0.75, c: '#333333' } : { pt: 0.5, c: '#b8c0cb' };
    const ruleC = word ? '#333333' : T.rule;
    const gridBdr = bd('top', 0.75, ruleC) + bd('left', 0.75, ruleC) + bd('bottom', 0.75, ruleC) + bd('right', 0.75, ruleC) + bd('insideH', hair.pt, hair.c) + bd('insideV', hair.pt, hair.c);
    const titlePrefix = lang === 'ja' ? 'QCチェックリスト - ' : 'QC Checklist - ';
    const out = [];

    // Header
    if (style === 'deployops') out.push(p([run('◢ ', { b: 1, sz: 12, color: T.rule }), run('DeployOps  ', { b: 1, sz: 11, color: T.rule, font: F }), run('QC WORKSHEET', { b: 1, sz: 7, color: T.ink2, font: FM, spc: 30 })], { after: 60 }));
    else if (style === 'plain') out.push(p([run(' QC WORKSHEET ', { b: 1, sz: 9.5, color: '#ffffff', fill: T.rule, font: FM, spc: 40 })], { after: 60 }));
    out.push(p([run(titlePrefix + section.displayName, { b: 1, sz: word ? 20 : 22, color: T.rule, font: FD })], { after: 80 }));
    const fw = Math.floor(CONTENT_W / 4);
    const fcell = (k, v) => tc(
      (word ? p([run(strip(k), { b: 1, sz: 11, color: T.rule, font: F })], { after: 20 }) : p([run(String(strip(k)).toUpperCase(), { sz: 7.5, color: T.ink2, font: FM, spc: 30 })], { after: 20 }))
      + p([run(v || ' ', { b: 1, sz: 11, color: T.rule, font: F })], { pbdr: { pt: 0.75, color: T.rule }, after: 0 }),
      { w: fw, mar: { t: 20, b: 20, l: 0, r: 240 }, va: 'bottom' });
    const revLbl = lang === 'ja' ? '改訂' : 'Rev';
    const revVal = (model && (model.rev || model.revision)) || 'A';
    out.push(tbl(trow(fcell(tr(lang, 'ws_field_unit'), unitName || '') + fcell(revLbl, revVal) + fcell(tr(lang, 'ws_field_operator'), '') + fcell(tr(lang, 'ws_field_date'), '')), [fw, fw, fw, fw]));
    out.push(p([], { pbdr: { pt: word ? 1.5 : 2.5, color: T.rule }, after: 160 }));

    // Legend
    const lw = Math.floor(CONTENT_W / 4);
    const lgTd = (cls, emoji, ttKey, ldKey) => {
      const col = cls === 'v' ? T.vBar : cls === 'r' ? T.rBar : cls === 'w' ? T.wBar : T.ink2;
      const fill = cls === 'v' ? T.vFill : cls === 'r' ? T.rFill : cls === 'w' ? T.wFill : (word ? '#f1f1ec' : '#ffffff');
      return tc(
        p([run(emoji + ' ', { sz: 9 }), run(strip(tr(lang, ttKey)), { b: 1, sz: 9, color: col, font: F })], { after: 20 })
        + p([run(strip(tr(lang, ldKey)), { sz: 8, color: T.rule, font: F })]),
        { w: lw, fill, mar: { t: 80, b: 80 }, va: 'top' });
    };
    out.push(tbl(trow(lgTd('plain', '\u2705', 'ws_legend_plain_title', 'ws_legend_plain_desc') + lgTd('v', '\uD83D\uDD0D', 'ws_legend_verify_title', 'ws_legend_verify_desc') + lgTd('r', '\u26A0', 'ws_legend_review_title', 'ws_legend_review_desc') + lgTd('w', '\u26D4', 'ws_legend_witness_title', 'ws_legend_witness_desc')), [lw, lw, lw, lw], { bdr: gridBdr }));
    out.push(spacer(160));

    // Phase tables
    const mt = DX(P.t), mb = DX(P.b);
    Object.entries(section.phaseItems).forEach(([phase, list]) => {
      const phaseTxt = lang === 'ja'
        ? (phaseLabel(phase, true, lang) || (PHASE_META[phase] || {}).label || phase)
        : (WS_PHASE_TITLES_EN[phase] || (PHASE_META[phase] || {}).label || phase);
      const rows = [];
      rows.push(trow(tc(p([run(word ? phaseTxt : String(phaseTxt).toUpperCase(), word ? { b: 1, i: 1, sz: 12, color: T.rule, font: 'Times New Roman' } : { b: 1, sz: 8.5, color: T.rule, font: FM, spc: 30 })]), { span: 5, fill: '#ffffff', mar: { t: 70, b: 40 } })));
      const heads = ['#', tr(lang, 'ws_col_item'), tr(lang, 'ws_col_notes'), tr(lang, 'op'), tr(lang, 'qcCol')];
      rows.push(trow(heads.map((h, ci) => tc(p([run(String(strip(h)).toUpperCase(), { b: 1, sz: 7.5, color: word ? T.rule : T.ink2, font: FM, spc: 24 })], { jc: ci === 1 || ci === 2 ? undefined : 'center' }), { w: CW[ci], fill: T.headBg, mar: { t: 50, b: 40 } })).join('')));
      list.forEach((it, i) => {
        const t = wsTier(it);
        const grp = wsSplitGroup(pickField(it, 'label', lang) || '').group;
        const prevGrp = i > 0 ? wsSplitGroup(pickField(list[i - 1], 'label', lang) || '').group : null;
        if (grp && grp !== prevGrp) rows.push(trow(tc(p([run(String(grp).toUpperCase(), { b: 1, sz: 10, color: T.rule, font: FM, spc: 28 })]), { span: 5, fill: '#e9ecf1', bdr: bd('bottom', 1.5, T.rule), mar: { t: Math.max(50, mt), b: Math.max(50, mb) } })));
        const fill = t.cls === 'v' ? T.vFill : t.cls === 'r' ? T.rFill : t.cls === 'w' ? T.wFill : '#ffffff';
        const wTopBdr = t.cls === 'w' ? bd('top', 1.75, T.wBar) : '';
        const edgeBar = t.cls === 'v' ? bd('left', 3, T.vBar) : t.cls === 'r' ? bd('left', 3, T.rBar) : t.cls === 'w' ? bd('left', 3, T.wBar) : '';
        const label = wsSplitGroup(pickField(it, 'label', lang) || '').text;
        const desc = pickField(it, 'description', lang) || '';
        const mkTc = (content, o) => tc(content, Object.assign({ fill, bdr: wTopBdr || undefined, mar: { t: mt, b: mb } }, o));
        let itemP = p([run(label, { b: 1, sz: 11.5, color: T.rule, font: F })]);
        let stopP = '';
        if (t.cls === 'r' || t.cls === 'w') { const stopTag = t.cls === 'w' ? (lang === 'ja' ? '\u25A0 \u505C\u6B62 \u2014 \u7ACB\u4F1A\u5FC5\u9808\u30FB\u5358\u72EC\u4F5C\u696D\u7981\u6B62' : '\u25A0 STOP \u2014 WITNESS REQUIRED') : (lang === 'ja' ? '\u25A0 \u505C\u6B62 \u2014 \u76E3\u7763\u8005\u306E\u78BA\u8A8D' : '\u25A0 STOP \u2014 SUP SIGN-OFF'); stopP = p([run(stopTag, { b: 1, sz: 8.5, color: t.cls === 'w' ? T.wBar : T.rBar, font: FM, spc: 16 })], { before: desc ? 20 : 0 }); }
        let notesP;
        if (t.cls === 'v') notesP = p([run('☐ ', { sz: 11, color: T.vBar, font: 'Segoe UI Symbol' }), run(desc || strip(tr(lang, 'ws_verification_mark')), { i: 1, sz: 9, color: T.ink2, font: F })]);
        else notesP = (desc ? p([run(desc, { sz: 9.5, color: T.ink2, font: F })]) : (stopP ? '' : p([]))) + stopP;
        const cb = (sz, color) => run('☐', { sz, color, font: 'Segoe UI Symbol' });
        let opTc, qcTc;
        if (t.cls === 'r' || t.cls === 'w') {
          const bar = t.cls === 'w' ? T.wBar : T.rBar;
          const lockFill = t.cls === 'w' ? T.lockW : T.lockR;
          opTc = word
            ? mkTc(p([run('N/A', { b: 1, sz: 9, color: T.rule, font: F })], { jc: 'center' }), { w: CW[3], mar: { t: mt, b: mb, l: 20, r: 20 } })
            : tc(p([run('🔒', { sz: 10 })], { jc: 'center' }) + (style === 'deployops' ? p([run('LOCKED', { b: 1, sz: 6, color: bar, font: FM, spc: 16 })], { jc: 'center' }) : ''), { w: CW[3], fill: lockFill, bdr: wTopBdr || undefined, mar: { t: mt, b: mb, l: 20, r: 20 } });
          qcTc = mkTc(p([cb(t.cls === 'w' ? 16 : 14, bar)], { jc: 'center' }) + p([run(t.cls === 'w' ? 'WIT' : 'SUP', { b: 1, sz: 7, color: bar, font: FM, spc: 24 })], { jc: 'center' }), { w: CW[4], mar: { t: mt, b: mb, l: 20, r: 20 } });
        } else {
          opTc = mkTc(p([cb(13, T.rule)], { jc: 'center' }), { w: CW[3], mar: { t: mt, b: mb, l: 20, r: 20 } });
          qcTc = mkTc(p([cb(13, T.rule)], { jc: 'center' }), { w: CW[4], mar: { t: mt, b: mb, l: 20, r: 20 } });
        }
        rows.push(trow(
          mkTc(p([run(String(i + 1).padStart(2, '0'), { b: 1, sz: 11, color: T.rule, font: FM })], { jc: 'center' }), { w: CW[0], bdr: (edgeBar + wTopBdr) || undefined, mar: { t: mt, b: mb, l: 20, r: 20 } })
          + mkTc(itemP, { w: CW[1] })
          + mkTc(notesP, { w: CW[2] })
          + opTc + qcTc));
      });
      out.push(tbl(rows.join(''), CW, { bdr: gridBdr }));
      out.push(spacer(160));
    });

    // Footer signature strip
    const ftw = Math.floor(CONTENT_W / 3);
    const ft = (kKey, subKey) => tc(
      p([run(word ? strip(tr(lang, kKey)) : String(strip(tr(lang, kKey))).toUpperCase(), { b: 1, sz: word ? 10 : 8, color: T.rule, font: word ? F : FM, spc: word ? 0 : 30 })], { after: 0 })
      + p([], { pbdr: { pt: 0.75, color: T.rule }, before: 360, after: 40 })
      + p([run(String(strip(tr(lang, subKey))).toUpperCase(), { sz: 7, color: T.ink2, font: FM, spc: 20 })]),
      { w: ftw, bdr: bd('top', word ? 1.5 : 2.5, T.rule), mar: { t: 100, b: 40, l: 0, r: 240 }, va: 'top' });
    out.push(tbl(trow(ft('ws_footer_completed_by', 'ws_footer_print_sign') + ft('ws_footer_supervisor', 'ws_footer_print_sign') + ft('ws_footer_date_completed', 'ws_footer_date_placeholder')), [ftw, ftw, ftw]));

    if (style === 'deployops') out.push(p([run(' DEPLOYOPS ', { b: 1, sz: 7.5, color: '#ffb020', fill: T.rule, font: FM, spc: 30 }), run('  WS-' + wsCode(model && model.ref, section.sectionName) + ' · rev A · generated ' + wsTodayISO() + '   —   RETURN SIGNED COPY TO QC BIN', { sz: 7.5, color: T.ink2, font: FM, spc: 20 })], { before: 160 }));
    return out.join('');
  }

  async function exportWorksheetDocx(m, unitName, sectionDocs, lang, style, pad) {
    const T = wsWordTheme(style);
    const P = wsWordDensity(pad);
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    const body = sectionDocs.map(s => sectionXml(m, unitName, s, lang, style, T, P)).join(pageBreak);
    const mainFont = style === 'word' ? 'Calibri' : 'IBM Plex Sans';
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="907" w:right="794" w:bottom="794" w:left="907" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${mainFont}" w:hAnsi="${mainFont}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('word/document.xml', docXml);
    zip.file('word/styles.xml', stylesXml);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const safe = s => (s || '').replace(/[\\/:*?"<>|]+/g, '-').trim();
    const fname = `QC Worksheet - ${safe(pickField(m, 'name', lang) || (m && m.name) || 'Model')}${unitName ? ' - ' + safe(unitName) : ''}.docx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Word document (.docx) downloaded', 'ok');
  }
  window.exportWorksheetDoc = exportWorksheetDocx;
})();
