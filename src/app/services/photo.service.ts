import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Geolocation, Position } from '@capacitor/geolocation';


const outputCanvas = document.getElementById('outputCanvas') as HTMLCanvasElement;
const ctx = outputCanvas.getContext('2d');

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: UserPhoto[] = [];
  public resizedPhotos: ResizedPhoto[] = [];
  public base64Photos: string[] = [];
  public currentLat: number = 47.36667;
  public currentLon: number = 8.25;

  constructor() {
  }

  private async savePicture(photo: Photo) {
    // Convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    console.log("### savePicture");
    console.log(savedFile);
    console.log(photo.webPath);

    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: photo.webPath
    };
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
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    console.log(capturedPhoto);    

    const shorterSideLength = 384;

    const savedImageFile = await this.savePicture(capturedPhoto);

    this.photos.unshift(savedImageFile);

    await this.resizeImage(capturedPhoto.webPath!, shorterSideLength);

  }

  public async resizeImage(blobUrl: string, shorterSideLength: number) {
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

            //console.log('Base64 data:', base64Data);
            console.log(typeof (base64Data));
            if (typeof base64Data === 'string') {
              console.log('base64Data is a string.');
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