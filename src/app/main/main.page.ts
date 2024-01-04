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
  Lat = "Latitude",
  Lon = "Longitude",
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
  public manualDate: string = "";

  public currentLat: number = 47.36667;
  public currentLon: number = 8.25;

  public manualLat: number = 47.36667;
  public manualLon: number = 8.25;

  public isDateManual: boolean = false;
  public isLatManual: boolean = false;
  public isLonManual: boolean = false;

  public response: string = "";
  public allAttributes: string[] = [];
  public selectedAttributes: string[] = [];
  public num_taxon_id: number = 5;
  public req_taxon_id: number = 1046220;
  public req_taxon_id_str: string = "1046220";
  public isReqTaxonIdAlphaNumeric: boolean = false;
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public urlWsl: string = "https://speciesid.wsl.ch/florid";
  public selectedApi: ApiStruct = { name: "Plants - Info Flora", url: this.urlInfoflora };
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
      value && !isNaN(value) ? this.req_taxon_id = Number(value) : null;
    });
    store?.get('isReqTaxonIdAlphaNumeric').then(value => {
      console.log("isReqTaxonIdAlphaNumeric value in storage: ", value);
      value ? this.isReqTaxonIdAlphaNumeric = value : null;
    });
    store?.get('req_taxon_id_str').then(value => {
      console.log("req_taxon_id_str value in storage: ", value);
      value ? this.req_taxon_id_str = value : null;
    });

    store?.get('isDateManual').then(value => {
      console.log("isDateManual value in storage: ", value);
      value ? this.isDateManual = value : null;
    });
    store?.get('isLatManual').then(value => {
      console.log("isLatManual value in storage: ", value);
      value ? this.isLatManual = value : null;
    });
    store?.get('isLonManual').then(value => {
      console.log("isLonManual value in storage: ", value);
      value ? this.isLonManual = value : null;
    });

    store?.get('manualDate').then(value => {
      console.log("manualDate value in storage: ", value);
      value ? this.manualDate = value : null;
    });
    store?.get('manualLat').then(value => {
      console.log("manualLat value in storage: ", value);
      value ? this.manualLat = value : null;
    });
    store?.get('manualLon').then(value => {
      console.log("manualLon value in storage: ", value);
      value ? this.manualLon = value : null;
    });
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
    this.updateCoords();
  }

  async submit() {
    if (!this.isDateManual) {
      this.setDate();
    }
    const body: any = {};
    if (this.selectedAttributes.includes(Attribute.Images)) body.images = this.photoService.base64Photos;
    if (this.selectedAttributes.includes(Attribute.Lat)) body.lat = this.isLatManual ? this.manualLat : this.currentLat;
    if (this.selectedAttributes.includes(Attribute.Lon)) body.lon = this.isLonManual ? this.manualLon : this.currentLon;
    if (this.selectedAttributes.includes(Attribute.Date)) body.date = this.isDateManual ? this.manualDate : this.date;
    if (this.selectedAttributes.includes(Attribute.NumTaxonId)) body.num_taxon_ids = this.num_taxon_id;
    if (this.selectedAttributes.includes(Attribute.ReqTaxonId)) body.req_taxon_ids = this.isReqTaxonIdAlphaNumeric ? [this.req_taxon_id_str] : [this.req_taxon_id];
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
    const value = (e as CustomEvent).detail.value;
    if (this.isReqTaxonIdAlphaNumeric) {
      store?.set("req_taxon_id_str", value);
    } else {
      store?.set("req_taxon_id", value);
    }
  }

  isReqTaxonIdAlphaNumericChange(e: Event) {
    console.log("isReqTaxonIdAlphaNumericChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    store?.set("isReqTaxonIdAlphaNumeric", value);
    if (this.isReqTaxonIdAlphaNumeric) {
      store?.set("req_taxon_id_str", this.req_taxon_id_str);
    } else {
      store?.set("req_taxon_id", this.req_taxon_id);
    }
  }

  setDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);
    this.date = formattedDate;
    if (this.manualDate == "" || this.manualDate == null) this.manualDate = formattedDate;
  }

  isDateManualChange(e: Event) {
    console.log("isDateManualChange");
    console.log(e);
    const isManual = (e as CustomEvent).detail.value;
    if (!this.isDateManual) {
      this.manualDate = this.date;
    }
    store?.set("isDateManual", isManual);
    store?.set("manualDate", this.manualDate);
  }

  isLatManualChange(e: Event) {
    console.log("isLatManualChange");
    console.log(e);
    const isManual = (e as CustomEvent).detail.value;
    if (!this.isLatManual) {
      this.manualLat = this.currentLat;
    }
    store?.set("isLatManual", isManual);
    store?.set("manualLat", this.manualLat);
  }

  isLonManualChange(e: Event) {
    console.log("isLonManualChange");
    console.log(e);
    const isManual = (e as CustomEvent).detail.value;
    if (!this.isLonManual) {
      this.manualLon = this.currentLon;
    }
    store?.set("isLonManual", isManual);
    store?.set("manualLon", this.manualLon);
  }

  onManualDateChange(e: Event) {
    console.log("onManualDateChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    store?.set("manualDate", value);
  }

  onManualLatChange(e: Event) {
    console.log("onManualLatChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    store?.set("manualLat", value);
  }

  onManualLonChange(e: Event) {
    console.log("onManualLonChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    store?.set("manualLon", value);
  }

  updateCoords() {
    Geolocation.getCurrentPosition().then((coords) => {
      console.log('Current position:', coords);
      this.currentLat = coords.coords.latitude;
      this.currentLon = coords.coords.longitude;
      if (!this.isLatManual) {
        this.manualLat = coords.coords.latitude;
        store?.set("manualLat", this.manualLat);
      }
      if (!this.isLonManual) {
        this.manualLon = coords.coords.longitude;
        store?.set("manualLon", this.manualLon);
      }
    })
  }

  selectedAttributesChange(e: Event) {
    console.log("selectedAttributesChange", e);
    const selectedAttributes = (e as CustomEvent).detail.value;
    this.selectedAttributes = selectedAttributes;
    store?.set("selectedAttributes", this.selectedAttributes);
  }

  isAttributeSelected(name: string) {
    return this.selectedAttributes.includes(name);
  }

  attributeCheckClicked(name: string) {
    if (this.selectedAttributes.includes(name)) {
      this.removeAttribute(name);
    } else {
      this.selectAttribute(name);
    }
  }

  selectAttribute(name: string) {
    console.log("selectAttribute: " + name);
    this.selectedAttributes.push(name);
    store?.set("selectedAttributes", this.selectedAttributes);
  }

  removeAttribute(name: string) {
    console.log("removeAttribute: " + name);
    this.selectedAttributes = this.selectedAttributes.filter(a => a !== name);
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
      this.setInfoFloraApi();
    }
    this.customApis = this.customApis.filter(a => a.name !== api.name);
    store?.set("customApis", this.customApis);
  }

  selectApi(api: ApiStruct) {
    console.log("selectApi: ", api);
    this.selectedApi = api;
    store?.set("selectedApi", this.selectedApi);
  }

  setInfoFloraApi() {
    this.selectedApi = { name: "Plants - Info Flora", url: this.urlInfoflora };
    store?.set("selectedApi", this.selectedApi);
  }

  setWslApi() {
    this.selectedApi = { name: "Plants - WSL", url: this.urlWsl };
    store?.set("selectedApi", this.selectedApi);
  }

}

export interface ApiStruct {
  name: string;
  url: string;
}
