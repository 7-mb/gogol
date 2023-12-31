import { Component, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ImageCropperModule } from 'ngx-image-cropper';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { LoadingController } from '@ionic/angular';

const store = new Storage();
store.create();

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
  imports: [IonicModule, CommonModule, FormsModule, ImageCropperModule]
})
export class MainPage {
  @ViewChild('cropper') cropper: ImageCropperComponent | undefined;

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

  constructor(public photoService: PhotoService,
    private http: HttpClient,
    private loadingCtrl: LoadingController) { }

  ngOnInit() {
    this.initStorageValues();
    this.updateCoords();
    this.attributesAll = Object.values(Attribute);
    this.attributesSelected = this.attributesAll;
    this.setDate();
    console.log(this.attributesAll);
  }

  initStorageValues() {
    store?.get('api').then(value => {
      console.log("api value in storage: " + value);
      value ? this.api = value : null;
    });
    store?.get('url').then(value => {
      console.log("url value in storage: " + value);
      value ? this.url = value : null;
    });
    store?.get('urlLocal').then(value => {
      console.log("urlLocal value in storage: " + value);
      value ? this.urlLocal = value : null;
    });
    store?.get('num_taxon_id').then(value => {
      console.log("num_taxon_id value in storage: " + value);
      value ? this.num_taxon_id = Number(value) : null;
    });
    store?.get('req_taxon_id').then(value => {
      console.log("req_taxon_id value in storage: " + value);
      value ? this.req_taxon_id = Number(value) : null;
    });
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
    this.updateCoords();
  }

  cropImage() {
    console.log("Manually trigger the crop 1");
    this.cropper?.crop();
    this.photoService.cropImage();
  }

  imageCropped(event: ImageCroppedEvent) {
    this.photoService.imageCropped(event);
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
    
    const loading = await this.loadingCtrl.create();
    await loading.present();

    this.http.post<any>(requestUrl, body, { headers }).subscribe({
      next: data => {
        this.response = JSON.stringify(data, undefined, 2);
        this.loadingCtrl.dismiss();
      },
      error: error => {
        this.response = JSON.stringify(error, undefined, 2);
        this.loadingCtrl.dismiss();
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

    store?.set("api", this.api);
    store?.set("url", this.url);
  }

  setLocalUrl() {
    this.url = this.urlLocal;
    store?.set("url", this.urlLocal);
    store?.set("urlLocal", this.urlLocal);
  }

  numTaxonIdChange(e: Event) {
    console.log("numTaxonIdChange");
    console.log(e);
    const id = (e as CustomEvent).detail.value;
    store?.set("num_taxon_id", id);
  }

  reqTaxonIdChange(e: Event) {
    console.log("reqTaxonIdChange");
    console.log(e);
    const id = (e as CustomEvent).detail.value;
    store?.set("req_taxon_id", id);
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
