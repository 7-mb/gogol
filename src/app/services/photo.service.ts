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

  myImage: any = null;
  croppedImage: any = '';
  transform: ImageTransform = {};
  isMobile = Capacitor.getPlatform() !== 'web';

  capturedImage: Photo | null = null;

  public photos: UserPhoto[] = [];
  public resizedPhotos: ResizedPhoto[] = [];
  public base64Photos: string[] = [];
  public currentLat: number = 47.36667;
  public currentLon: number = 8.25;

  constructor(private loadingCtrl: LoadingController) {
  }

  /*private async savePicture(webPath: string, base64: string) {
    console.log("### savePicture");
    // Write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data
    });

    
    //console.log(savedFile);
    console.log(webPath);

    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: webPath
    };
  }*/

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
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      //resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      quality: 100,
      saveToGallery: true
    });

    //const loading = await this.loadingCtrl.create();
    //await loading.present();

    console.log("myImage set");
    console.log(capturedPhoto);

    this.myImage = await this.readAsBase64(capturedPhoto);

    //this.myImage = `data:image/jpeg;base64,${capturedPhoto.base64String}`;
    this.capturedImage = capturedPhoto;
    this.croppedImage = null;
  }

  // Called when cropper is ready
  imageLoaded() {
    console.log("imageLoaded");
    this.loadingCtrl.dismiss();
  }

  // Called when we finished editing (because autoCrop is set to false)
  imageCropped(event: ImageCroppedEvent) {
    console.log("imageCropped");
    console.log(event);
    console.log(event.blob);
    this.croppedImage = event.base64;
    this.processImage(event);
  }

  imageNotCropped() {
    this.myImage = null;
    console.log("imageNotCropped");
    console.log(this.capturedImage?.webPath!);
    console.log(this.capturedImage);
    this.processImage(null);
  }

  public async processImage(event: ImageCroppedEvent | null) {
    console.log("processImage");
    const objectUrl = event !== null ? event.objectUrl : this.capturedImage?.webPath!;
    const base64 = event !== null ? event.base64 : this.capturedImage?.base64String

    const shorterSideLength = 384;
    /*const savedImageFile = await this.savePicture(objectUrl || "", base64 || "");
    this.photos.unshift(savedImageFile);*/

    this.photos.unshift({
      filepath: "-",
      webviewPath: objectUrl || ""
    });

    await this.resizeImage(objectUrl || "", shorterSideLength);
  }

  loadImageFailed() {
    console.log('Image load failed!');
    this.myImage = null;
  }

  cropImage() {
    console.log("Manually trigger the crop 2");
    this.myImage = null;
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

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

export interface ResizedPhoto {
  webviewPath?: string;
}