const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Leer variables de entorno
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
    console.error('❌ No se encontraron las variables de entorno de Supabase');
    process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
    console.log('🔍 Consultando permisos de SUPERVISOR TERRENO en Supabase...\n');

    const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .eq('id', 'SUPERVISOR TERRENO')
        .single();

    if (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    console.log('✅ Datos encontrados:\n');
    console.log('ID:', data.id);
    console.log('Nombre:', data.name);
    console.log('Descripción:', data.description);
    console.log('Nivel:', data.level);
    console.log('\n📋 PERMISOS:');
    console.log(JSON.stringify(data.permissions, null, 2));

    // Desglosar permisos
    console.log('\n📊 Desglose de permisos:');
    for (const [module, perms] of Object.entries(data.permissions)) {
        const permArray = perms.split('');
        const permissions = {
            Create: permArray.includes('C') ? '✅' : '❌',
            Read: permArray.includes('R') ? '✅' : '❌',
            Update: permArray.includes('U') ? '✅' : '❌',
            Delete: permArray.includes('D') ? '✅' : '❌'
        };
        console.log(`\n${module}:`);
        console.log(`  C (Create): ${permissions.Create}`);
        console.log(`  R (Read):   ${permissions.Read}`);
        console.log(`  U (Update): ${permissions.Update}`);
        console.log(`  D (Delete): ${permissions.Delete}`);
    }
})();
