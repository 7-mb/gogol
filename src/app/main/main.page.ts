import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ImageCropperModule } from 'ngx-image-cropper';
import { LoadingController } from '@ionic/angular';

const store = new Storage();
store.create();

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
  Attribute = Attribute;

  //  https -> android:networkSecurityConfig="@xml/network_security_config"

  public date: string = "";
  public response: string = "";
  public allAttributes: string[] = [];
  public selectedAttributes: string[] = [];
  public num_taxon_id: number = 5;
  public req_taxon_id: number = 1046220;
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public selectedApi: ApiStruct = { name: "Infoflora", url: this.urlInfoflora };
  public customApis: ApiStruct[] = [];
  public newCustomApi: ApiStruct = { name: "", url: "" };
  public apiModalOpen: boolean = false;
  public requestParameterModalOpen: boolean = false;

  loadingCtrl: LoadingController;

  constructor(public photoService: PhotoService,
    private http: HttpClient) {
    this.loadingCtrl = new LoadingController();
  }

  ngOnInit() {
    this.initStorageValues();
    this.updateCoords();
    this.allAttributes = Object.values(Attribute);
    this.selectedAttributes = this.allAttributes;
    this.setDate();
    console.log(this.allAttributes);
  }

  initStorageValues() {
    store?.get('selectedApi').then(value => {
      console.log("selectedApi value in storage: ", value);
      value ? this.selectedApi = value : null;
    });
    store?.get('customApis').then(value => {
      console.log("customApis value in storage: ", value);
      value ? this.customApis = value : null;
    });
    store?.get('selectedAttributes').then(value => {
      console.log("selectedAttributes value in storage: ", value);
      value ? this.selectedAttributes = value : null;
    });
    store?.get('num_taxon_id').then(value => {
      console.log("num_taxon_id value in storage: ", value);
      value ? this.num_taxon_id = Number(value) : null;
    });
    store?.get('req_taxon_id').then(value => {
      console.log("req_taxon_id value in storage: ", value);
      value ? this.req_taxon_id = Number(value) : null;
    });
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
    this.updateCoords();
  }

  async submit() {
    this.setDate();
    const body: any = {};
    if (this.selectedAttributes.includes(Attribute.Images)) body.images = this.photoService.base64Photos;
    if (this.selectedAttributes.includes(Attribute.LatLon)) body.lat = this.photoService.currentLat;
    if (this.selectedAttributes.includes(Attribute.LatLon)) body.lon = this.photoService.currentLon;
    if (this.selectedAttributes.includes(Attribute.Date)) body.date = this.date;
    if (this.selectedAttributes.includes(Attribute.NumTaxonId)) body.num_taxon_ids = this.num_taxon_id;
    if (this.selectedAttributes.includes(Attribute.ReqTaxonId)) body.req_taxon_ids = [this.req_taxon_id];
    console.log(body);

    let requestUrl = 'https://corsproxy.io/?' + encodeURIComponent(this.selectedApi.url);
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
    this.photoService.croppingImage = null;
    this.photoService.lastCropEvent = null;
    this.response = "";
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

  selectedAttributesChange(e: Event) {
    console.log("selectedAttributesChange", e);
    const selectedAttributes = (e as CustomEvent).detail.value;
    this.selectedAttributes = selectedAttributes;
    store?.set("selectedAttributes", this.selectedAttributes);
  }

  configureApisClicked() {
    console.log("configureApisClicked");
    this.apiModalOpen = true;
  }

  addCustomApi() {
    console.log("addCustomApi: " + this.newCustomApi.name + " - " + this.newCustomApi.url);
    if (this.newCustomApi.name !== "" && this.newCustomApi.url !== "") {
      this.customApis.push(this.newCustomApi);
      store?.set("customApis", this.customApis);
    }
    this.newCustomApi = { name: "", url: "" };
  }

  removeCustomApi(api: ApiStruct) {
    console.log("removeCustomApi: ", api);
    if (this.selectedApi.name === api.name) {
      this.resetApi();
    }
    this.customApis = this.customApis.filter(a => a.name !== api.name);
    store?.set("customApis", this.customApis);
  }

  selectApi(api: ApiStruct) {
    console.log("selectApi: ", api);
    this.selectedApi = api;
    store?.set("selectedApi", this.selectedApi);
  }

  resetApi() {
    this.selectedApi = { name: "Infoflora", url: this.urlInfoflora };
    store?.set("selectedApi", this.selectedApi);
  }

}

export interface ApiStruct {
  name: string;
  url: string;
}
