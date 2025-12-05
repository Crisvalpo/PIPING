// Tipos genéricos para respuestas de API

export interface ApiResponse<T = any> {
    success: boolean
    message: string
    data?: T
}

export interface PaginatedResponse<T> {
    success: boolean
    data: T[]
    total: number
    page: number
    pageSize: number
}

export interface ErrorResponse {
    success: false
    message: string
    error?: string
    code?: string
}
