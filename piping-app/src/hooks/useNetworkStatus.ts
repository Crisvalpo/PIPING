'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para detectar el estado de la conexión AL SERVIDOR (Mini-PC)
 * No solo verifica internet, sino que el servidor sea alcanzable.
 * 
 * @param checkUrl - URL para verificar (health check o ping). Por defecto la raíz.
 * @param intervalMs - Intervalo de verificación en milisegundos (default 10s cuando online)
 */
export function useNetworkStatus(checkUrl: string = '/api/health', intervalMs: number = 30000) {
    const [isServerReachable, setIsServerReachable] = useState(true);

    // Estado base del navegador
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBrowserOnline = () => {
            setIsOnline(true);
            checkServerReachability(); // Verificar servidor inmediatamente
        };
        const handleBrowserOffline = () => {
            setIsOnline(false);
            setIsServerReachable(false); // Si no hay red, no hay servidor
        };

        window.addEventListener('online', handleBrowserOnline);
        window.addEventListener('offline', handleBrowserOffline);

        // Intervalo para verificar "ping" al servidor (solo si hay red)
        const intervalId = setInterval(() => {
            if (navigator.onLine) {
                checkServerReachability();
            }
        }, intervalMs);

        // Verificación inicial
        checkServerReachability();

        return () => {
            window.removeEventListener('online', handleBrowserOnline);
            window.removeEventListener('offline', handleBrowserOffline);
            clearInterval(intervalId);
        };

        async function checkServerReachability() {
            if (!navigator.onLine) {
                setIsServerReachable(false);
                return;
            }

            try {
                // Intentamos un fetch ligero al servidor
                // Usamos timestamp para evitar caché
                const res = await fetch(`${checkUrl}?t=${Date.now()}`, {
                    method: 'HEAD',
                    cache: 'no-store',
                    mode: 'no-cors' // Para evitar problemas si el ping es a otro origen, aunque idealmente es mismo origen
                });

                // En modo no-cors (opaque), no podemos ver status, pero si no lanza error, asumimos conectividad básica
                // Si queremos ser estrictos, necesitamos un endpoint que devuelva 200 OK en mismo dominio
                setIsServerReachable(true);
            } catch (error) {
                console.warn('Servidor no alcanzable:', error);
                setIsServerReachable(false);
            }
        }
    }, [checkUrl, intervalMs]);

    // Retornamos true solo si ambas condiciones se cumplen
    return isOnline && isServerReachable;
}
