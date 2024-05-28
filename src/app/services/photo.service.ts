import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import 'hammerjs';
import { ImageCroppedEvent, ImageTransform, } from 'ngx-image-cropper';
import { Capacitor } from '@capacitor/core';
import { LoadingController } from '@ionic/angular';

const outputCanvas = document.getElementById('outputCanvas') as HTMLCanvasElement;
const ctx = outputCanvas.getContext('2d');

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  croppingImage: any = null;
  lastCropEvent: ImageCroppedEvent | null = null;
  transform: ImageTransform = {};
  isMobile = Capacitor.getPlatform() !== 'web';
  isCropping: boolean = false;
  asdfasdf = "asdfasdf";
  imgLat: number = 0;
  imgLon: number = 0;

  capturedImage: Photo | null = null;

  public photos: string[] = [];
  public resizedPhotos: ResizedPhoto[] = [];
  public base64Photos: string[] = [];

  loadingCtrl: LoadingController;

  constructor() {
    this.loadingCtrl = new LoadingController();
  }

  private async readAsBase64(photo: Photo) {
    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public async addNewToGallery() {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 100,
      saveToGallery: true
    });
    const loading = await this.loadingCtrl.create();
    await loading.present();

    console.log("captured photo:");
    console.log(capturedPhoto);

    this.croppingImage = await this.readAsBase64(capturedPhoto);
    this.capturedImage = capturedPhoto;

    /*let img = {
      exif: {
        GPS: {
          Latitude: 47.35398,
          Longitude: 7.899116666667
        }
      }
    } as Photo;*/

    /*let img = {
      exif: {
        GPSLatitude: "47/1,21/1,15/1",
        GPSLongitude: "7/1,53/1,56/1"
      }
    } as Photo;*/

    if (this.imgLat == 0 || this.imgLon == 0) {
      if (this.hasImageIosCoords(capturedPhoto)) {
        this.imgLat = capturedPhoto?.exif?.GPS?.Latitude;
        this.imgLon = capturedPhoto?.exif?.GPS?.Longitude;
        console.log("### IOS coords: " + this.imgLat + ", " + this.imgLon);
      }
      else if (this.hasImageAndroidCoords(capturedPhoto)) {
        this.imgLat = this.parseAndroidCoord(capturedPhoto.exif.GPSLatitude);
        this.imgLon = this.parseAndroidCoord(capturedPhoto.exif.GPSLongitude);
        console.log("### Android coords: " + this.imgLat + ", " + this.imgLon);
      } else {
        console.log("### No image coords found");
      }
    }

    this.asdfasdf = JSON.stringify(capturedPhoto, undefined, 2);
  }

  private hasImageIosCoords(img: Photo): boolean {
    return img?.exif?.GPS?.Latitude !== undefined &&
      typeof img?.exif?.GPS?.Latitude === 'number' &&
      !isNaN(img?.exif?.GPS?.Latitude) &&
      img?.exif?.GPS?.Longitude !== undefined &&
      typeof img?.exif?.GPS?.Longitude === 'number' &&
      !isNaN(img?.exif?.GPS?.Longitude);
  }

  private hasImageAndroidCoords(img: Photo): boolean {
    return img?.exif?.GPSLatitude !== undefined &&
      typeof img?.exif?.GPSLatitude === 'string' &&
      img?.exif?.GPSLatitude.includes(",") &&
      img?.exif?.GPSLatitude.includes("/") &&
      img?.exif?.GPSLongitude !== undefined &&
      typeof img?.exif?.GPSLongitude === 'string' &&
      img?.exif?.GPSLongitude.includes(",") &&
      img?.exif?.GPSLongitude.includes("/")
  }

  private parseAndroidCoord(coord: string): number {
    const MINUTES_DIVISOR = 60
    const SECONDS_DIVISOR = 60 * 60
    let degrees, minuteParts, minutes, minuteDenominator, secondParts, seconds, secondsDenominator, divisor
    let parts = coord.split('/') as Array<string>
    [degrees, minuteParts, secondParts, divisor] = parts
    minuteParts = minuteParts.split(',') as Array<string>
    [minuteDenominator, minutes] = minuteParts
    secondParts = secondParts.split(',') as Array<string>
    [secondsDenominator, seconds] = secondParts
    let dd: any = parseFloat(degrees) + (parseFloat(minutes) * parseInt(minuteDenominator)) / MINUTES_DIVISOR + (parseFloat(seconds) * parseInt(secondsDenominator)) / SECONDS_DIVISOR / parseFloat(divisor)
    return dd as number
  }

  // Called when cropper is ready
  imageLoaded() {
    console.log("imageLoaded");
    this.loadingCtrl.dismiss();
  }

  startCropImage() {
    console.log("startCropImage");
    this.isCropping = true;
  }

  imageCropped(event: ImageCroppedEvent) {
    console.log("imageCropped");
    this.lastCropEvent = event;
    this.isCropping = false;
  }

  imageNotCropped() {
    this.lastCropEvent = null;
    console.log("imageNotCropped");
    console.log(this.capturedImage?.webPath!);
    console.log(this.capturedImage);
    this.processImage();
  }

  public async processImage() {
    console.log("processImage");
    this.croppingImage = null;
    const event = this.lastCropEvent;
    const objectUrl = event !== null ? event.objectUrl : this.capturedImage?.webPath!;
    this.photos.unshift(objectUrl || "");
    const shorterSideLength = 384;
    await this.resizeImage(objectUrl || "", shorterSideLength);
  }

  loadImageFailed() {
    console.log('Image load failed!');
    this.croppingImage = null;
    this.lastCropEvent = null;
  }

  public async resizeImage(blobUrl: string, shorterSideLength: number) {
    console.log("resizeImage: " + blobUrl);
    try {
      // Create a new Image object
      const img = new Image();

      // Load the Blob URL as the image source
      img.src = blobUrl;

      // Wait for the image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const newDimensions = this.calculateNewDimensions(img.naturalWidth, img.naturalHeight, shorterSideLength);

      // Set the canvas dimensions
      outputCanvas.width = newDimensions.width;
      outputCanvas.height = newDimensions.height;

      // Draw the resized image onto the canvas
      if (ctx == null) throw new Error("CanvasRenderingContext2D is null");
      ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height);

      // Convert the canvas to a Blob
      outputCanvas.toBlob((newBlob) => {
        const objectUrl = URL.createObjectURL(newBlob!);
        console.log("resized photo: " + objectUrl)
        this.resizedPhotos.unshift({
          webviewPath: objectUrl
        });
        console.log(this.resizedPhotos);

        // Create a FileReader
        const reader = new FileReader();

        // Set up an event handler for when the FileReader has finished reading the Blob
        reader.onloadend = (() => {
          if (reader.readyState === FileReader.DONE) {
            // The result property of the FileReader contains the base64-encoded data
            const base64Data = reader.result?.toString();
            if (typeof base64Data === 'string') {
              const base64DataCut = base64Data.split(',')[1];
              this.base64Photos.unshift(base64DataCut);
            } else {
              console.error('base64Data is NOT a string.');
            }
          }
        });

        // Read the Blob as a data URL (base64)
        if (newBlob != null) reader.readAsDataURL(newBlob);

      });
    } catch (error) {
      console.error('Error resizing image:', error);
    }
  }

  public calculateNewDimensions(
    oldWidth: number,
    oldHeight: number,
    shorterSideLength: number
  ): { width: number; height: number } {
    let newWidth = oldWidth;
    let newHeight = oldHeight;

    if (Math.min(oldWidth, oldHeight) > shorterSideLength) {
      const scaleFactor = shorterSideLength / Math.min(oldWidth, oldHeight);
      newWidth *= scaleFactor;
      newHeight *= scaleFactor;
    }

    return { width: newWidth, height: newHeight };
  }

}

export interface ResizedPhoto {
  webviewPath?: string;
}