import { ToolRegistry, PermissionManager } from '../web/js/core.js';
import { registerAllTools } from '../web/js/tools.js';

async function runTest() {
  const tools = new ToolRegistry(new PermissionManager());
  const state = { 
    projectFiles: { 
      'test.js': 'function calculateTotal() {\r\n  const subtotal = 100;\r\n  const tax = subtotal * 0.16;\r\n  return subtotal + tax;\r\n}' 
    } 
  };
  registerAllTools(tools, { state });
  const editTool = tools.get('edit_file');
  
  // Probar coincidencia con saltos \n vs \r\n y variación de indentación
  const res = await editTool.run({
    path: 'test.js',
    target: 'const tax = subtotal * 0.16;\nreturn subtotal + tax;',
    replacement: 'const tax = subtotal * 0.18;\nconsole.log("impuesto actualizado");\nreturn subtotal + tax;'
  });

  console.log('Resultado Fast Apply:', res);
  console.log('Contenido actualizado:\n' + state.projectFiles['test.js']);
  
  if (state.projectFiles['test.js'].includes('0.18') && state.projectFiles['test.js'].includes('impuesto actualizado')) {
    console.log('✅ TEST FAST APPLY: PASS');
  } else {
    console.error('❌ TEST FAST APPLY: FAIL');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
