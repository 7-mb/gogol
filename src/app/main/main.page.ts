import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Geolocation, Position } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

enum API {
  Infoflora = 0,
  WSL = 1,
  Local = 2
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
    
  //  https -> android:networkSecurityConfig="@xml/network_security_config"

  public response: string = "";
  public num_taxon_id: number = 5;
  public req_taxon_id: number = 1046220;
  public api: API = API.Infoflora;
  public host: string = "http://192.168.1.78";
  public port: string = "1234";
  public urlLocal: string = "http://127.0.0.1:8000/identify/images";
  public urlInfoflora: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public urlWsl: string = "https://florid.infoflora.ch/api/v1/public/identify/images";
  public url: string = this.urlInfoflora;
  public requestInProgress: boolean = false;
  
  constructor(public photoService: PhotoService, private http: HttpClient) {
    this.updateCoords();
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
    console.log(this.photoService.photos);
    this.updateCoords();
  }

  async submit() {
    const body = {
      images: /*["https://picsum.photos/20"], */ this.photoService.base64Photos,
      lat: this.photoService.currentLat,
      lon: this.photoService.currentLon,
      date: this.getDate(),
      num_taxon_ids: this.num_taxon_id,
      req_taxon_ids: [this.req_taxon_id]
    };
    console.log(body);

    let requestUrl = [API.Infoflora, API.WSL].includes(this.api) ? 'https://corsproxy.io/?' + encodeURIComponent(this.url) : this.url;

    const options = {
      url: requestUrl,
      headers: {'Content-Type': 'application/json'},
      data: body,
    };
  
    this.requestInProgress = true;
    const response: HttpResponse = await CapacitorHttp.post(options);
    this.requestInProgress = false;

    this.response = JSON.stringify(response, undefined, 2); 
    console.log(response);
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

    switch(api) { 
      case API.Infoflora: { 
         this.url = this.urlInfoflora
         break; 
      } 
      case API.WSL: { 
        this.url = this.urlWsl; 
         break; 
      } 
      case API.Local: { 
        this.url = this.urlLocal;
        //this.setLocalUrl();
        break; 
     } 
      default: { 
         break; 
      } 
   }

  }

  setLocalUrl() {
    this.url = this.urlLocal;
    //this.url = this.host + ":" + this.port + "/api/v1/public/identify/images";
  }

  getDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);
    return formattedDate;
  }

  updateCoords() {
    Geolocation.getCurrentPosition().then((coords) => {
      console.log('Current position:', coords);

      this.photoService.currentLat = coords.coords.latitude;
      this.photoService.currentLon = coords.coords.longitude;
    })
  }

}
