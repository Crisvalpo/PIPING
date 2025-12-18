/**
 * Generate safe, descriptive filename for levantamiento photos
 * Pattern: {ISO}-{REV}-{SPOOL}-{LEV_NUM}-{PHOTO_INDEX}-{RANDOM}.{ext}
 * Example: 3800PR-SW-380-5260-1-Rev2-SP01-003-001-a3f8d2.jpg
 */
export function generateLevantamientoFileName(params: {
    isometricCode: string;
    revisionCode: string;
    spoolCode: string;
    levNum: string;
    photoIndex: number;
    randomSuffix: string;
    extension?: string;
}): string {
    const ext = (params.extension || 'jpg').toLowerCase().replace(/^\./, '');

    const parts = [
        params.isometricCode,
        params.revisionCode,
        params.spoolCode,
        params.levNum,
        String(params.photoIndex + 1).padStart(3, '0'),
        params.randomSuffix
    ];

    return parts.join('_') + '.' + ext;
}

/**
 * Get levantamiento count for a spool (for numbering)
 */
export async function getLevantamientoNumber(
    spoolNumber: string,
    projectId: string,
    db: any
): Promise<string> {
    const count = await db.levantamientos
        .where({ spool_number: spoolNumber, project_id: projectId })
        .count();

    return String(count + 1).padStart(3, '0');
}

/**
 * Generate 6-character random suffix for collision avoidance
 */
export function generateRandomSuffix(): string {
    return Math.random().toString(36).substring(2, 8).toLowerCase();
}
