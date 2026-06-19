import { IsObject, IsString, IsUrl, ValidateNested } from 'class-validator';

export class JobMetadataDto {
  @IsUrl({ require_tld: false })
  callbackUrl: string;

  @IsString()
  externalRef: string;

  @IsString()
  type: string;
}

export class ParsedJobMetadataDto {
  @ValidateNested()
  @IsObject()
  metadata: JobMetadataDto;
}
