# Flujo de Prueba - Sistema de Jornadas

## 📋 Paso a Paso para Probar

### 1. Configurar Jornadas (PRIMERO)

**Ir a:** `/admin/proyecto`

**Click en:** "Gestionar Jornadas" (tarjeta azul con reloj)

**Crear 3 jornadas:**

#### Jornada 1: 5x2
```
Nombre: 5x2
Tipo: Semanal Fijo (FIXED_WEEKLY)
Días de trabajo: 5
Días de descanso: 2
```

#### Jornada 2: 14x14 A
```
Nombre: 14x14 A
Tipo: Rotativo (ROTATING)
Días de trabajo: 14
Días de descanso: 14
Fecha inicio grupo: 2025-01-01
Grupo: A
```

#### Jornada 3: 14x14 B
```
Nombre: 14x14 B
Tipo: Rotativo (ROTATING)
Días de trabajo: 14
Días de descanso: 14
Fecha inicio grupo: 2025-01-15
Grupo: B
```

---

### 2. Importar Personal

**Ir a:** `/settings/personal`

**Click en:** "Importar Personal"

**Archivo:** `database/scripts/personal-ejemplo.csv`

**Resultado esperado:**
- ✅ 15 trabajadores importados
- ✅ Códigos asignados (SOL-001, MAE-001, etc.)
- ✅ Jornadas asignadas automáticamente

---

### 3. Verificar en Tabla

**En:** `/settings/personal`

**Debería ver:**

| Nombre | Código | Jornada | Rol |
|--------|--------|---------|-----|
| JUAN PEREZ | SOL-001 | [5x2] | SOLDADOR |
| MARIA LOPEZ | MAE-001 | [5x2] | MAESTRO |
| CARLOS SANCHEZ | SOL-003 | [14x14 A] | SOLDADOR |
| JORGE VARGAS | SOL-005 | [14x14 B] | SOLDADOR |

- Columna "Código" muestra el código interno
- Columna "Jornada" muestra badge cyan con el nombre de la jornada

---

### 4. Probar Función is_worker_on_duty()

**En pgAdmin / DBeaver:**

```sql
-- Verificar quien debe trabajar HOY
SELECT 
    p.nombre,
    p.codigo_trabajador,
    ws.nombre as jornada,
    is_worker_on_duty(p.rut, CURRENT_DATE) as debe_trabajar_hoy
FROM personal p
LEFT JOIN work_schedules ws ON p.work_schedule_id = ws.id
WHERE p.proyecto_id = 'f2579cfe-5d45-435e-8016-b6a87cbb9725'
ORDER BY ws.nombre, p.nombre;
```

**Resultado esperado (hoy es domingo):**
- 5x2 → false (descanso)
- 14x14 A → depends on cycle
- 14x14 B → depends on cycle

---

### 5. Crear Cuadrillas

**Ir a:** `/proyectos/f2579cfe-5d45-435e-8016-b6a87cbb9725/cuadrillas/manage`

**Click:** "Nueva Cuadrilla"

**Ejemplo:**
```
Nombre: CR-001
Capataz: ANA GARCIA (CAP-001)
```

**Luego:** Asignar maestros y soldadores desde el Kanban

---

## 🎯 Puntos Clave a Verificar

### ✅ Import CSV
- [x] Lee columna CODIGO correctamente
- [x] Lee columna JORNADA correctamente
- [x] Busca jornada por nombre
- [x] Asigna work_schedule_id automáticamente
- [x] Si jornada no existe, continúa sin asignar (warning en console)

### ✅ Tabla Personal
- [x] Columna "Código" visible
- [x] Columna "Jornada" visible con badge cyan
- [x] Badge muestra nombre de jornada (5x2, 14x14 A, etc.)
- [x] Si no tiene jornada, muestra "-"

### ✅ Gestión de Jornadas
- [x] Modal abre y cierra correctamente
- [x] Lista jornadas existentes
- [x] Muestra conteo de trabajadores asignados
- [x] Permite crear nueva jornada
- [x] Valida nombre único
- [x] Fecha inicio requerida para ROTATING
- [x] No permite eliminar si tiene trabajadores

### ✅ Función is_worker_on_duty()
- [x] 5x2: true Lun-Vie, false Sab-Dom
- [x] 14x14: calcula según ciclo desde fecha inicio
- [x] Respeta overrides manuales

---

## 📊 Distribución del Personal de Ejemplo

- **5x2:** 7 trabajadores (todos Lun-Vie)
- **14x14 A:** 4 trabajadores (ciclo desde 01-Ene)
- **14x14 B:** 4 trabajadores (ciclo desde 15-Ene)

**Roles:**
- 1 Supervisor
- 1 Capataz  
- 4 Maestros
- 9 Soldadores

**Total:** 15 trabajadores

---

## 🐛 Troubleshooting

### Si al importar CSV no asigna jornada:
1. Verificar que las jornadas existen en el proyecto
2. Check console del navegador (F12) para warnings
3. Nombres deben coincidir exactamente (case-sensitive)

### Si no aparece columna Código/Jornada:
1. Verificar que migraci
