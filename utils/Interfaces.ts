export enum Role {
  User = 0,
  Bot = 1,
}

export interface File {
  file_path: string;
  file_type: string, 
  id: number, 
  name: string,
  s3_url: string
}
export interface Message {
  role: Role;
  content: string;
  imageUrl?: string;
  prompt?: string;
  category?: string;
  files?: File[];
  message_type?: string;

}

export interface Chat {
  id: number;
  title: string;
}
