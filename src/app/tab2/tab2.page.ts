import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { PhotoService } from '../services/photo.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Geolocation, Position } from '@capacitor/geolocation';
import { FormsModule } from '@angular/forms';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';


@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, ExploreContainerComponent, CommonModule, FormsModule]
})
export class Tab2Page {

  public response: string = "";
  public num_taxon_id: number = 5;
  public req_taxon_id: number = 1046220;
  public strawberries: string = "asdf";
  public url: string = "asdf";
  
  constructor(public photoService: PhotoService, private http: HttpClient) {
    this.updateCoords();
  }

  setUrl(url: string) {
    console.log("asdfasdfasdf");
    this.url = url;
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

    //const url = 'https://corsproxy.io/?' + encodeURIComponent('https://florid.infoflora.ch/api/v1/public/identify/images');
    const url = 'http://192.168.1.78:1234/identify/images';

    const options = {
      url: url,
      //url: 'https://cors-anywhere.herokuapp.com/https://florid.infoflora.ch/api/v1/public/identify/images',
      //url: 'http://192.168.1.78:1234/identify/images',
      //mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      data: body,
    };
  
    const response: HttpResponse = await CapacitorHttp.post(options);

    this.response = JSON.stringify(response, undefined, 2); 
    console.log(response);

    /*this.http.post<any>('https://florid.infoflora.ch/api/v1/public/identify/images', body).subscribe(data => {
      this.response = data;
      console.log(data);
    },
    error => {
      this.response = error.status + ", " + error.statusText;
      console.log(error);
  });*/
  }

  clear() {
    this.photoService.photos.length = 0;
    this.photoService.resizedPhotos.length = 0;
    this.photoService.base64Photos.length = 0;
    this.response = "";
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
