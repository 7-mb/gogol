import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { ImageCropperModule } from 'ngx-image-cropper';
import { LoadingController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

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

  public date: string = "";
  public manualDate: string = "";

  public currentLat: number = 47.36667;
  public currentLon: number = 8.25;

  public manualLat: number = this.currentLat;
  public manualLon: number = this.currentLon;

  public isDateManual: boolean = false;
  public isLatManual: boolean = false;
  public isLonManual: boolean = false;

  public response: string = "";
  public allAttributes: string[] = [];
  public selectedAttributes: string[] = [];
  public num_taxon_id: number = 5;
  public req_taxon_ids: number[] = [1046220];
  public req_taxon_ids_str: string[] = ["1046220"];
  public isReqTaxonIdsAlphaNumeric: boolean = false;
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public urlWsl: string = "https://speciesid.wsl.ch/florid";
  public selectedApi: ApiStruct = { name: "Plants - Info Flora", url: this.urlInfoflora };
  public customApis: ApiStruct[] = [];
  public newCustomApi: ApiStruct = { name: "", url: "" };
  public apiModalOpen: boolean = false;
  public requestParameterModalOpen: boolean = false;

  loadingCtrl: LoadingController;

  constructor(public photoService: PhotoService) {
    this.loadingCtrl = new LoadingController();
  }

  ngOnInit() {
    console.log("Capacitor platform is: ", JSON.stringify(Capacitor.getPlatform()));
    this.allAttributes = Object.values(Attribute);
    this.selectedAttributes = this.allAttributes;
    this.setDate();
    this.initStoreValues();
    setInterval(() => this.updateCoords(), 3000);
  }

  initStoreValues() {
    const storeValueNames: (keyof MainPage)[] = [
      'selectedApi',
      'customApis',
      'selectedAttributes',
      'num_taxon_id',
      'req_taxon_ids',
      'isReqTaxonIdsAlphaNumeric',
      'req_taxon_ids_str',
      'isDateManual',
      'isLatManual',
      'isLonManual',
      'manualDate',
      'manualLat',
      'manualLon'
    ];
    storeValueNames.forEach(name => this.initStoreValue(name));
  }

  async initStoreValue<K extends keyof MainPage>(property: K): Promise<void> {
    const value: MainPage[K] = await store?.get(property);
    console.log(`${property} value in storage: `, value);
    if (value !== null && value !== undefined) {
      this[property] = value as this[K];
    }
  }

  async setStoreValue<K extends keyof MainPage>(name: K, value: any) {
    await store?.set(name, value);
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
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
    if (this.selectedAttributes.includes(Attribute.ReqTaxonId)) body.req_taxon_ids = this.isReqTaxonIdsAlphaNumeric ? this.req_taxon_ids_str : this.req_taxon_ids;
    console.log(body);

    let requestUrl = Capacitor.getPlatform() === 'web' ?
      'https://corsproxy.io/?' + encodeURIComponent(this.selectedApi.url) :
      this.selectedApi.url;

    const loading = await this.loadingCtrl.create();
    await loading.present();

    const headers = {
      'Accept': '*/*',
      'Content-Type': 'application/json',
    };

    fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(response => response.json())
      .then(data => {
        this.response = JSON.stringify(data, undefined, 2);
        this.loadingCtrl.dismiss();
      })
      .catch(error => {
        this.response = JSON.stringify(error, undefined, 2);
        this.loadingCtrl.dismiss();
        console.error('There was an error!', error);
        alert('There was an error: HTTP ' + error.status + ' ' + error.statusText + '. Check response output.');
      });
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
    this.setStoreValue("num_taxon_id", id);
  }

  reqTaxonIdsChange(e: Event) {
    console.log("reqTaxonIdsChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    const values: (number | string)[] = value.split(',');
    const uniqueValues = values.filter((value, index, self) => self.indexOf(value) === index);

    console.log(value);
    console.log(values);
    console.log(uniqueValues);

    if (this.isReqTaxonIdsAlphaNumeric) {
      this.req_taxon_ids_str = uniqueValues.map((value) => value.toString());
      console.log(this.req_taxon_ids_str);
      this.setStoreValue("req_taxon_ids_str", this.req_taxon_ids_str);
    } else {
      this.req_taxon_ids = uniqueValues.map((value) => parseInt(value as string, 10)).filter((value) => !isNaN(value as number));
      console.log(this.req_taxon_ids);
      this.setStoreValue("req_taxon_ids", this.req_taxon_ids);
    }
  }

  isReqTaxonIdsAlphaNumericChange(e: Event) {
    console.log("isReqTaxonIdsAlphaNumericChange");
    console.log(e);
    const value = (e as CustomEvent).detail.checked;
    this.setStoreValue("isReqTaxonIdsAlphaNumeric", value);
    if (this.isReqTaxonIdsAlphaNumeric) {
      this.setStoreValue("req_taxon_ids_str", this.req_taxon_ids_str);
    } else {
      this.setStoreValue("req_taxon_ids", this.req_taxon_ids);
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
    const isManual = (e as CustomEvent).detail.checked;
    if (!this.isDateManual) {
      this.manualDate = this.date;
    }
    this.setStoreValue("isDateManual", isManual);
    this.setStoreValue("manualDate", this.manualDate);
  }

  isLatManualChange(e: Event) {
    console.log("isLatManualChange");
    console.log(e);
    const isManual = (e as CustomEvent).detail.checked;
    if (!this.isLatManual) {
      this.manualLat = this.currentLat;
    }
    this.setStoreValue("isLatManual", isManual);
    this.setStoreValue("manualLat", this.manualLat);
  }

  isLonManualChange(e: Event) {
    console.log("isLonManualChange");
    console.log(e);
    const isManual = (e as CustomEvent).detail.checked;
    if (!this.isLonManual) {
      this.manualLon = this.currentLon;
    }
    this.setStoreValue("isLonManual", isManual);
    this.setStoreValue("manualLon", this.manualLon);
  }

  onManualDateChange(e: Event) {
    console.log("onManualDateChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    this.setStoreValue("manualDate", value);
  }

  onManualLatChange(e: Event) {
    console.log("onManualLatChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    this.setStoreValue("manualLat", value);
  }

  onManualLonChange(e: Event) {
    console.log("onManualLonChange");
    console.log(e);
    const value = (e as CustomEvent).detail.value;
    this.setStoreValue("manualLon", value);
  }

  updateCoords() {
    Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }).then((coords) => {
      console.log('Current position: ' + coords.coords.latitude + ", " + coords.coords.longitude);
      this.currentLat = coords.coords.latitude;
      this.currentLon = coords.coords.longitude;
      if (!this.isLatManual) {
        this.manualLat = coords.coords.latitude;
        this.setStoreValue("manualLat", this.manualLat);
      }
      if (!this.isLonManual) {
        this.manualLon = coords.coords.longitude;
        this.setStoreValue("manualLon", this.manualLon);
      }
    })
  }

  selectedAttributesChange(e: Event) {
    console.log("selectedAttributesChange", e);
    const selectedAttributes = (e as CustomEvent).detail.value;
    this.selectedAttributes = selectedAttributes;
    this.setStoreValue("selectedAttributes", this.selectedAttributes);
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
    this.setStoreValue("selectedAttributes", this.selectedAttributes);
  }

  removeAttribute(name: string) {
    console.log("removeAttribute: " + name);
    this.selectedAttributes = this.selectedAttributes.filter(a => a !== name);
    this.setStoreValue("selectedAttributes", this.selectedAttributes);
  }

  configureApisClicked() {
    console.log("configureApisClicked");
    this.apiModalOpen = true;
  }

  addCustomApi() {
    console.log("addCustomApi: " + this.newCustomApi.name + " - " + this.newCustomApi.url);
    if (this.newCustomApi.name !== "" && this.newCustomApi.url !== "") {
      this.customApis.push(this.newCustomApi);
      this.setStoreValue("customApis", this.customApis);
    }
    this.newCustomApi = { name: "", url: "" };
  }

  removeCustomApi(api: ApiStruct) {
    console.log("removeCustomApi: ", api);
    if (this.selectedApi.name === api.name) {
      this.setInfoFloraApi();
    }
    this.customApis = this.customApis.filter(a => a.name !== api.name);
    this.setStoreValue("customApis", this.customApis);
  }

  selectApi(api: ApiStruct) {
    console.log("selectApi: ", api);
    this.selectedApi = api;
    this.setStoreValue("selectedApi", this.selectedApi);
  }

  setInfoFloraApi() {
    this.selectedApi = { name: "Plants - Info Flora", url: this.urlInfoflora };
    this.setStoreValue("selectedApi", this.selectedApi);
  }

  setWslApi() {
    this.selectedApi = { name: "Plants - WSL", url: this.urlWsl };
    this.setStoreValue("selectedApi", this.selectedApi);
  }

}

export interface ApiStruct {
  name: string;
  url: string;
}
