export class Base64UploadAdapter {
    constructor(private loader: any) { }
    upload() {
        return this.loader.file.then((file: File) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ default: reader.result });
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        }));
    }
    abort() { }
}

export function Base64UploadAdapterPlugin(editor: any) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
        return new Base64UploadAdapter(loader);
    };
}
