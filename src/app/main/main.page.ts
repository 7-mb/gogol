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
import { ResponseWsl } from '../ApiResponseWsl';
import { ResponseInfoFlora } from '../ApiResponseInfoFlora';
import { ApiStruct, Attribute, ResponseFormat } from '../Definitions';
import { ResultTableWslComponent } from '../result-table/result-table-wsl.component';

const store = new Storage();
store.create();

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ImageCropperModule, ResultTableWslComponent]
})
export class MainPage {
  Attribute = Attribute;
  ResponseFormat = ResponseFormat;

  public date: string = "";
  public manualDate: string = "";

  public currentLat: number = 47.36667;
  public currentLon: number = 8.25;

  public manualLat: number = this.currentLat;
  public manualLon: number = this.currentLon;

  public isDateManual: boolean = false;
  public isLatManual: boolean = false;
  public isLonManual: boolean = false;

  public responseRaw: string = "";
  public responseInfoFlora: ResponseInfoFlora | null = null;
  public responseWsl: ResponseWsl | null = null;
  public currentResponseFormat: ResponseFormat = ResponseFormat.None;

  public allAttributes: string[] = [];
  public selectedAttributes: string[] = [];
  public num_taxon_id: number = 5;
  public req_taxon_ids: number[] = [1046220];
  public req_taxon_ids_str: string[] = ["1046220"];
  public isReqTaxonIdsAlphaNumeric: boolean = false;
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public urlWsl: string = "https://speciesid.wsl.ch/florid";
  public selectedApi: ApiStruct = { name: "Plants - WSL", url: this.urlWsl };
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
    this.setResponse();
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
        if (data && data.data && Array.isArray(data.data)) {
          this.responseInfoFlora = data as ResponseInfoFlora;
          this.currentResponseFormat = ResponseFormat.InfoFlora;
          console.log(this.responseInfoFlora);
        } else if (data && data.top_n && data.top_n.by_image) {
          this.responseWsl = data as ResponseWsl;
          this.currentResponseFormat = ResponseFormat.WSL;
          console.log(this.responseWsl);
        } else {
          this.currentResponseFormat = ResponseFormat.Raw;
        }
        this.responseRaw = JSON.stringify(data, undefined, 2);
        this.loadingCtrl.dismiss();
      })
      .catch(error => {
        this.responseRaw = JSON.stringify(error, undefined, 2);
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
    this.responseRaw = '';
    this.responseInfoFlora = null;
    this.responseWsl = null;
    this.currentResponseFormat = ResponseFormat.None;
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

  setResponse() {
    /*this.responseRaw = "{\r\n  \"success\": true,\r\n  \"data\": [\r\n    {\r\n      \"taxon_id\": 1006490,\r\n      \"probability\": 0.95,\r\n      \"coverage\": 3\r\n    },\r\n    {\r\n      \"taxon_id\": 1026710,\r\n      \"probability\": 0.89,\r\n      \"coverage\": 3\r\n    },\r\n    {\r\n      \"taxon_id\": 1003730,\r\n      \"probability\": 0.77,\r\n      \"coverage\": 3\r\n    },\r\n    {\r\n      \"taxon_id\": 1005650,\r\n      \"probability\": 0.58,\r\n      \"coverage\": 3\r\n    },\r\n    {\r\n      \"taxon_id\": 1021450,\r\n      \"probability\": 0.49,\r\n      \"coverage\": 3\r\n    },\r\n    {\r\n      \"taxon_id\": 1046220,\r\n      \"probability\": 0.09,\r\n      \"coverage\": 3\r\n    }\r\n  ]\r\n}";
    this.responseInfoFlora = JSON.parse(this.responseRaw) as ResponseInfoFlora;
    this.currentResponseFormat = ResponseFormat.InfoFlora;
   */

    //this.responseRaw = " {\r\n  \"top_n\": {\r\n    \"by_image\": {\r\n      \"id\": [\r\n        \"1008080\",\r\n        \"1003730\",\r\n        \"1026710\",\r\n        \"1005650\",\r\n        \"1005640\"\r\n      ],\r\n      \"name\": [\r\n        \"Callistephus chinensis (L.) Nees\",\r\n        \"Anemone blanda Schott & Kotschy\",\r\n        \"Leucanthemum vulgare aggr.\",\r\n        \"Aster amellus L.\",\r\n        \"Aster alpinus L.\"\r\n      ],\r\n      \"image_model\": [\r\n        3.37,\r\n        0.69,\r\n        0.65,\r\n        0.4,\r\n        0.36\r\n      ],\r\n      \"ecological_model\": [\r\n        null,\r\n        0,\r\n        0.02,\r\n        0,\r\n        0\r\n      ],\r\n      \"relative_eco_score\": [\r\n        null,\r\n        31,\r\n        10,\r\n        28,\r\n        54\r\n      ],\r\n      \"combined_model\": [\r\n        null,\r\n        0.78,\r\n        1.07,\r\n        0.24,\r\n        0.32\r\n      ],\r\n      \"coverage\": [\r\n        2,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    },\r\n    \"by_ecology\": {\r\n      \"id\": [\r\n        \"1036590\",\r\n        \"1007600\",\r\n        \"1039325\",\r\n        \"1038390\",\r\n        \"1017380\"\r\n      ],\r\n      \"name\": [\r\n        \"Prunus laurocerasus L.\",\r\n        \"Buddleja davidii Franch.\",\r\n        \"Rubus fruticosus aggr.\",\r\n        \"Rhus typhina L.\",\r\n        \"Eranthis hyemalis (L.) Salisb.\"\r\n      ],\r\n      \"image_model\": [\r\n        0.03,\r\n        0.04,\r\n        0.07,\r\n        0.04,\r\n        0.04\r\n      ],\r\n      \"ecological_model\": [\r\n        22.12,\r\n        11.77,\r\n        2.78,\r\n        2.77,\r\n        2\r\n      ],\r\n      \"relative_eco_score\": [\r\n        1,\r\n        1,\r\n        1,\r\n        1,\r\n        1\r\n      ],\r\n      \"combined_model\": [\r\n        0.42,\r\n        0.35,\r\n        0.57,\r\n        0.23,\r\n        0.28\r\n      ],\r\n      \"coverage\": [\r\n        3,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    },\r\n    \"by_combined\": {\r\n      \"id\": [\r\n        \"1006490\",\r\n        \"1046570\",\r\n        \"1026710\",\r\n        \"1003730\",\r\n        \"1039325\"\r\n      ],\r\n      \"name\": [\r\n        \"Bellis perennis L.\",\r\n        \"Thlaspi arvense L.\",\r\n        \"Leucanthemum vulgare aggr.\",\r\n        \"Anemone blanda Schott & Kotschy\",\r\n        \"Rubus fruticosus aggr.\"\r\n      ],\r\n      \"image_model\": [\r\n        0.31,\r\n        0.19,\r\n        0.65,\r\n        0.69,\r\n        0.07\r\n      ],\r\n      \"ecological_model\": [\r\n        1.14,\r\n        0.02,\r\n        0.02,\r\n        0,\r\n        2.78\r\n      ],\r\n      \"relative_eco_score\": [\r\n        1,\r\n        11,\r\n        10,\r\n        31,\r\n        1\r\n      ],\r\n      \"combined_model\": [\r\n        2.18,\r\n        1.16,\r\n        1.07,\r\n        0.78,\r\n        0.57\r\n      ],\r\n      \"coverage\": [\r\n        3,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    }\r\n  },\r\n  \"requested_taxa\": {\r\n    \"id\": [\r\n      \"1046220\"\r\n    ],\r\n    \"name\": [\r\n      \"Tephroseris helenitis (L.) B. Nord.\"\r\n    ],\r\n    \"image_model\": [\r\n      0.03\r\n    ],\r\n    \"ecological_model\": [\r\n      0\r\n    ],\r\n    \"relative_eco_score\": [\r\n      100\r\n    ],\r\n    \"combined_model\": [\r\n      0\r\n    ],\r\n    \"coverage\": [\r\n      3\r\n    ]\r\n  },\r\n  \"Warnings\": []\r\n}";
    this.responseRaw = " {\r\n  \"top_n\": {\r\n    \"by_image\": {\r\n      \"id\": [\r\n        \"1008080\",\r\n        \"1003730\",\r\n        \"1026710\",\r\n        \"1005650\",\r\n        \"1005640\"\r\n      ],\r\n      \"name\": [\r\n        \"Callistephus chinensis (L.) Nees\",\r\n        \"Anemone blanda Schott & Kotschy\",\r\n        \"Leucanthemum vulgare aggr.\",\r\n        \"Aster amellus L.\",\r\n        \"Aster alpinus L.\"\r\n      ],\r\n      \"image_model\": [\r\n        3.37,\r\n        0.69,\r\n        0.65,\r\n        0.4,\r\n        0.36\r\n      ],\r\n      \"ecological_model\": [\r\n        null,\r\n        0,\r\n        0.02,\r\n        0,\r\n        0\r\n      ],\r\n      \"relative_eco_score\": [\r\n        null,\r\n        31,\r\n        10,\r\n        28,\r\n        54\r\n      ],\r\n      \"combined_model\": [\r\n        null,\r\n        0.78,\r\n        1.07,\r\n        0.24,\r\n        0.32\r\n      ],\r\n      \"coverage\": [\r\n        2,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    },\r\n    \"by_ecology\": {\r\n      \"id\": [\r\n        \"1036590\",\r\n        \"1007600\",\r\n        \"1039325\",\r\n        \"1038390\",\r\n        \"1017380\"\r\n      ],\r\n      \"name\": [\r\n        \"Prunus laurocerasus L.\",\r\n        \"Buddleja davidii Franch.\",\r\n        \"Rubus fruticosus aggr.\",\r\n        \"Rhus typhina L.\",\r\n        \"Eranthis hyemalis (L.) Salisb.\"\r\n      ],\r\n      \"image_model\": [\r\n        0.03,\r\n        0.04,\r\n        0.07,\r\n        0.04,\r\n        0.04\r\n      ],\r\n      \"ecological_model\": [\r\n        22.12,\r\n        11.77,\r\n        2.78,\r\n        2.77,\r\n        2\r\n      ],\r\n      \"relative_eco_score\": [\r\n        1,\r\n        1,\r\n        1,\r\n        1,\r\n        1\r\n      ],\r\n      \"combined_model\": [\r\n        0.42,\r\n        0.35,\r\n        0.57,\r\n        0.23,\r\n        0.28\r\n      ],\r\n      \"coverage\": [\r\n        3,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    },\r\n    \"by_combined\": {\r\n      \"id\": [\r\n        \"1006490\",\r\n        \"1046570\",\r\n        \"1026710\",\r\n        \"1003730\",\r\n        \"1039325\"\r\n      ],\r\n      \"name\": [\r\n        \"Bellis perennis L.\",\r\n        \"Thlaspi arvense L.\",\r\n        \"Leucanthemum vulgare aggr.\",\r\n        \"Anemone blanda Schott & Kotschy\",\r\n        \"Rubus fruticosus aggr.\"\r\n      ],\r\n      \"image_model\": [\r\n        0.31,\r\n        0.19,\r\n        0.65,\r\n        0.69,\r\n        0.07\r\n      ],\r\n      \"ecological_model\": [\r\n        1.14,\r\n        0.02,\r\n        0.02,\r\n        0,\r\n        2.78\r\n      ],\r\n      \"relative_eco_score\": [\r\n        1,\r\n        11,\r\n        10,\r\n        31,\r\n        1\r\n      ],\r\n      \"combined_model\": [\r\n        2.18,\r\n        1.16,\r\n        1.07,\r\n        0.78,\r\n        0.57\r\n      ],\r\n      \"coverage\": [\r\n        3,\r\n        3,\r\n        3,\r\n        3,\r\n        3\r\n      ]\r\n    }\r\n  },\r\n  \"requested_taxa\": {\r\n    \"id\": [\r\n      \"1046220\"\r\n    ],\r\n    \"name\": [\r\n      \"Tephroseris helenitis (L.) B. Nord.\"\r\n    ],\r\n    \"image_model\": [\r\n      0.03\r\n    ],\r\n    \"ecological_model\": [\r\n      0\r\n    ],\r\n    \"relative_eco_score\": [\r\n      100\r\n    ],\r\n    \"combined_model\": [\r\n      0\r\n    ],\r\n    \"coverage\": [\r\n      3\r\n    ]\r\n  },\r\n  \"Warnings\": [\"asdf\",\"asdf\"]\r\n}";

    this.responseWsl = JSON.parse(this.responseRaw) as ResponseWsl;
    this.currentResponseFormat = ResponseFormat.WSL;
  }

}
