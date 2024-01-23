export interface ResponseWsl {
    top_n: TopN
    requested_taxa: RequestedTaxa
    Warnings: any[]
}

export interface TopN {
    by_image: ByImage
    by_ecology: ByEcology
    by_combined: ByCombined
}

export interface ByImage {
    id: string[]
    name: string[] | undefined[]
    image_model: number[] | undefined[]
    ecological_model: number[] | undefined[]
    relative_eco_score: number[] | undefined[]
    combined_model: number[] | undefined[]
    coverage: number[] | undefined[]
}

export interface ByEcology {
    id: string[]
    name: string[] | undefined[]
    image_model: number[] | undefined[]
    ecological_model: number[]
    relative_eco_score: number[]
    combined_model: number[]
    coverage: number[]
}

export interface ByCombined {
    id: string[]
    name: string[] | undefined[]
    image_model: number[] | undefined[]
    ecological_model: number[] | undefined[]
    relative_eco_score: number[] | undefined[]
    combined_model: number[] | undefined[]
    coverage: number[] | undefined[]
}

export interface RequestedTaxa {
    id: string[]
    name: string[] | undefined[]
    image_model: number[] | undefined[]
    ecological_model: number[] | undefined[]
    relative_eco_score: number[] | undefined[]
    combined_model: number[] | undefined[]
    coverage: number[] | undefined[]
}
