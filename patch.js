const fs = require('fs');

const files = [
  'src/pages/Cantine.jsx',
  'src/pages/Sondages.jsx',
  'src/pages/Pomodoro.jsx',
  'src/pages/Chat.jsx',
  'src/pages/Forum.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Import useLocation if not present
  if (!content.includes('useLocation')) {
    if (content.includes("from 'react-router-dom'")) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+'react-router-dom'/, (match, p1) => {
        return `import { ${p1.trim()}, useLocation } from 'react-router-dom'`;
      });
      changed = true;
    } else {
      content = "import { useLocation } from 'react-router-dom';\n" + content;
      changed = true;
    }
  }

  // 2. Add const location = useLocation() inside component
  const componentMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/);
  if (componentMatch) {
    const compDef = componentMatch[0];
    if (!content.includes('const location = useLocation()') && !content.includes('const location = useLocation();')) {
      content = content.replace(compDef, `${compDef}\n  const location = useLocation();`);
      changed = true;
    }
  }

  // 3. Add state={{ from: location.pathname }} to /login
  if (content.includes('to="/login"')) {
    content = content.replace(/to="\/login"(?!\s+state=\{)/g, 'to="/login" state={{ from: location.pathname }}');
    changed = true;
  }

  // 4. Add state={{ from: location.pathname }} to /register
  if (content.includes('to="/register"')) {
    content = content.replace(/to="\/register"(?!\s+state=\{)/g, 'to="/register" state={{ from: location.pathname }}');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched ' + file);
  }
}
