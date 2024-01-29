export enum Attribute {
    Images = "Images",
    Lat = "Latitude",
    Lon = "Longitude",
    Date = "Date",
    NumTaxonId = "Num. Taxon ID",
    ReqTaxonId = "Req. Taxon ID"
}

export enum ResponseFormat {
    InfoFlora, WSL, Raw, None
}

export interface ApiStruct {
    name: string;
    url: string;
}
