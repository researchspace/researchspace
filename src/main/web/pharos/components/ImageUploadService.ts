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
}
