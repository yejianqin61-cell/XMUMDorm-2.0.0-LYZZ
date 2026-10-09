import {Platform} from 'react-native';
export type PublishImage={uri:string;name:string;type:string;size:number};
/** React Native uses file descriptors; browsers require Blob rather than an object coerced to text. */
export async function appendPublishImage(form: FormData, image: PublishImage): Promise<void> {
 if(Platform.OS==='web') {
  const response=await fetch(image.uri);
  if(!response.ok)throw {kind:'content'};
  form.append('images',await response.blob(),image.name);
 } else form.append('images',{uri:image.uri,name:image.name,type:image.type} as unknown as Blob);
}
