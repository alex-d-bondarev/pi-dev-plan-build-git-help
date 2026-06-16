# pi-dev-plan-build-git-help

I want to limit [pi.dev](https://pi.dev/) actions based on the mode

## Install

```shell
pi install git:github.com/alex-d-bondarev/pi-dev-plan-build-git-help@v1.0.1
```

## Use

```
# start pi and type
/mode help

 Available modes — use /mode <name> to switch:

   /mode plan   Read-only. Analyse and plan changes. Only PLAN.md can be edited. Git commands are blocked.
   /mode build  Edit mode. Create and modify any files. Git commands are blocked.
   /mode git    Git mode. Run git commands freely. File editing is blocked.
   /mode help   This screen. Full access to pi extensions (~/.pi/agent/extensions/).
                Create, edit, or delete any pi extension. Read-only everywhere else.

 Extension source: ~/.pi/agent/extensions/modes/
```

## Future updates

### 1. Make a change

Edit necessary files including version/tag in the README.md -> Install section

### 2. Test the change

```bash
  npm install
  npm test
  npm run test:watch
```

### 3. Create, review and merge PR

Self evident

### 4. Create new tag

```shell
VERSION="1.0.2"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"
gh release create "v$VERSION" \
  --title "Release v$VERSION" \
  --notes "change description"
```
