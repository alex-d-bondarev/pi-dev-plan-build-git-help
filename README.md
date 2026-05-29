# pi-dev-plan-build-git-help

I want to limit pi.dev actions based on the mode

## Install

```shell
pi install git:github.com/alex-d-bondarev/pi-dev-plan-build-git-help@v1.0.0
```

## Use

```
/mode help
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
