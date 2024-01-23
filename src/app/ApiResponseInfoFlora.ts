export interface ResponseInfoFlora {
    success: boolean
    data: Daum[]
  }
  
  export interface Daum {
    taxon_id: number
    probability: number
    coverage: number
  }