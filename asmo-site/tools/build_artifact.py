"""Builds a single-file version (inline JS, no html/head/body wrappers) for artifact hosting."""
import re,os,json,sys
root=os.path.join(os.path.dirname(__file__),'..')
s=open(f'{root}/index.html').read()
for x in ['<!doctype html>\n','<html lang="uz">\n','<head>\n','<meta charset="utf-8">\n','<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n','</head>\n','<body>\n','</body>\n','</html>']:
    s=s.replace(x,'',1)
for f in ['js/bucket3d.js','js/app.js']:
    s=s.replace(f'<script src="{f}"></script>','<script>\n'+open(f'{root}/{f}').read()+'\n</script>')
out=sys.argv[1]; open(out,'w').write(s)
files={}
for d in ['assets']:
    for dp,_,fs in os.walk(f'{root}/{d}'):
        for f in fs:
            rel=os.path.relpath(os.path.join(dp,f),root); files[rel]=os.path.abspath(os.path.join(root,rel))
print(json.dumps(files))
