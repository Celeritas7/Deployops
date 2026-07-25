cd $PSScriptRoot
mkdir migrations, archive\revisions, archive\scraps -Force | Out-Null
# migrations
Move-Item "design\New folder\*.sql" migrations\
Remove-Item "design\New folder"
# guides -> docs
Move-Item LOGIN-IMPLEMENTATION.md,HANDOFF.md,DRAWING-UI-PORT.md,CC-Prompt-*.md docs\
# design one-off
Move-Item "Loctite Chip - Redesign Options.html" design\
# old revisions
Move-Item Temp,Temp1,Temp_2 archive\revisions\
# scraps
Move-Item index.baseline.html,index.html.bak-3b,a7d2a09-full.html,prototype.html,splice-3b.ps1,deployops-annotations.patch,check-inline-js.js archive\scraps\