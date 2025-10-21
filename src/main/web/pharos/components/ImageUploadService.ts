import { post, del, Response } from 'superagent';

export class ImageUploadService {
  public async uploadImage(
    file: File,
    storageId: string,
    onProgress: (progress: number) => void
  ): Promise<{ thumbnailUrl: string, fileName: string, storageId: string }> {
    return new Promise((resolve, reject) => {
        post('/file/image-upload')
        .attach('file', file as any)
        .field('storageId', storageId)
        .on('progress', (event) => {
          if (event.percent) {
            onProgress(event.percent);
          }
        })
        .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.body);
          }
        });
    });
  }

  public async deleteImage(fileName: string, storageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        del(`/file/image-upload?fileName=${fileName}&storageId=${storageId}`)
        .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
    });
  }

  /**
   * Constructs the thumbnail URL locally based on the file name and storage ID.
   * This avoids an extra network call by replicating the server-side URL generation logic.
   * @param fileName - The name of the original uploaded file.
   * @param storageId - The ID of the storage where the file is located.
   * @returns The formatted thumbnail URL.
   */
  public getThumbnailUrl(fileName: string, storageId: string): string {
    const thumbnailFileName = "thumb_" + fileName;
    return `/file/image-upload/thumbnail?fileName=${thumbnailFileName}&storageId=${storageId}`;
  }
}
