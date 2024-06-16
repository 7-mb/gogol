import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GeolocationContainer {

    static readonly DEFAULT_LAT: number = 47.36667;
    static readonly DEFAULT_LON: number = 8.25;

    public currentLat: number = GeolocationContainer.DEFAULT_LAT;
    public currentLon: number = GeolocationContainer.DEFAULT_LON;

}