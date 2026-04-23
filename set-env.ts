const { writeFileSync, mkdirSync, existsSync } = require('fs');
const path = require('path');

// Usamos una ruta absoluta para evitar perdernos en las carpetas
const envDir = path.resolve(__dirname, 'src/environments');

if (!existsSync(envDir)) {
  mkdirSync(envDir, { recursive: true });
}

const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${process.env['SUPABASE_URL'] || ''}',
  supabaseKey: '${process.env['SUPABASE_KEY'] || ''}'
};
`;

console.log('--- Generando Environment Luxe ---');
writeFileSync(path.join(envDir, 'environment.prod.ts'), envConfigFile);
writeFileSync(path.join(envDir, 'environment.ts'), envConfigFile);
console.log('--- Archivos creados con éxito ---');