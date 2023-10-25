import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

enum API {
  Infoflora = 0,
  WSL = 1,
  Local = 2
}

enum Attribute {
  Images = "Images",
  LatLon = "Latitude / Longitude",
  Date = "Date",
  NumTaxonId = "Num. Taxon ID",
  ReqTaxonId = "Req. Taxon ID"
}

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MainPage {
  API = API;
  Attribute = Attribute;

  //  https -> android:networkSecurityConfig="@xml/network_security_config"

  public response: string = "";
  public attributesAll: string[] = [];
  public attributesSelected: string[] = [];
  public num_taxon_id: number = 5;
  public req_taxon_id: number = 1046220;
  public api: API = API.Infoflora;
  public urlLocal: string = "http://127.0.0.1:8000/identify/images";
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public urlWsl: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public url: string = this.urlInfoflora;
  public date: string = "";
  public requestInProgress: boolean = false;

  constructor(public photoService: PhotoService, private http: HttpClient) { }

  ngOnInit() {
    this.updateCoords();
    this.attributesAll = Object.values(Attribute);
    this.attributesSelected = this.attributesAll;
    this.setDate();
    console.log(this.attributesAll);
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
    this.updateCoords();
  }

  async submit() {
    this.setDate();
    const body: any = {};
    if (this.attributesSelected.includes(Attribute.Images)) body.images = this.photoService.base64Photos;
    if (this.attributesSelected.includes(Attribute.LatLon)) body.lat = this.photoService.currentLat;
    if (this.attributesSelected.includes(Attribute.LatLon)) body.lon = this.photoService.currentLon;
    if (this.attributesSelected.includes(Attribute.Date)) body.date = this.date;
    if (this.attributesSelected.includes(Attribute.NumTaxonId)) body.num_taxon_ids = this.num_taxon_id;
    if (this.attributesSelected.includes(Attribute.ReqTaxonId)) body.req_taxon_ids = [this.req_taxon_id];
    console.log(body);

    let requestUrl = [API.Infoflora, API.WSL].includes(this.api) ?
      'https://corsproxy.io/?' + encodeURIComponent(this.url) : this.url;

    let headers = { 'Content-Type': 'application/json' };
    this.requestInProgress = true;
    this.http.post<any>(requestUrl, body, { headers }).subscribe({
      next: data => {
        this.response = JSON.stringify(data, undefined, 2);
        this.requestInProgress = false;
      },
      error: error => {
        this.response = JSON.stringify(error, undefined, 2);
        this.requestInProgress = false;
        console.error('There was an error!', error);
        alert('There was an error. Check response output.');
      }
    })

  }

  clear() {
    this.photoService.photos.length = 0;
    this.photoService.resizedPhotos.length = 0;
    this.photoService.base64Photos.length = 0;
    this.response = "";
  }

  apiChange(e: Event) {
    console.log(e);
    const api = (e as CustomEvent).detail.value;

    switch (api) {
      case API.Infoflora:
        this.url = this.urlInfoflora
        break;
      case API.WSL:
        this.url = this.urlWsl;
        break;
      case API.Local:
        this.url = this.urlLocal;
        break;
      default:
        break;
    }

  }

  setLocalUrl() {
    this.url = this.urlLocal;
  }

  setDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);
    this.date = formattedDate;
  }

  updateCoords() {
    Geolocation.getCurrentPosition().then((coords) => {
      console.log('Current position:', coords);

      this.photoService.currentLat = coords.coords.latitude;
      this.photoService.currentLon = coords.coords.longitude;
    })
  }

}
