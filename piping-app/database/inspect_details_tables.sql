SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'spools_welds';

SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'material_take_off';

SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'bolted_joints';
