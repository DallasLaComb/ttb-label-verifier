import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

export type BeverageCategory = 'wine' | 'distilled_spirits' | 'malt_beverage';

export interface ApplicationData {
  category: BeverageCategory;
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  producerNameAndAddress: string;
  countryOfOrigin: string;
}

export type FieldStatus = 'match' | 'mismatch' | 'needs_review';

export interface FieldResult {
  field: string;
  applicationValue?: string;
  extractedValue: string | null;
  status: FieldStatus;
  issues?: string[];
}

export interface VerifyResponse {
  overallStatus: FieldStatus;
  results: FieldResult[];
}

export const CATEGORY_LABELS: Record<BeverageCategory, string> = {
  wine: 'Wine',
  distilled_spirits: 'Distilled Spirits',
  malt_beverage: 'Malt Beverage',
};

export const FIELD_LABELS: Record<string, string> = {
  brandName: 'Brand Name',
  classType: 'Class/Type Designation',
  alcoholContent: 'Alcohol Content',
  netContents: 'Net Contents',
  producerNameAndAddress: 'Producer Name & Address',
  countryOfOrigin: 'Country of Origin',
  governmentWarning: 'Government Warning Statement',
};

@Component({
  selector: 'app-verify',
  imports: [FormsModule, KeyValuePipe],
  templateUrl: './verify.html',
})
export class Verify {
  protected readonly applicationData: ApplicationData = {
    category: 'distilled_spirits',
    brandName: '',
    classType: '',
    alcoholContent: '',
    netContents: '',
    producerNameAndAddress: '',
    countryOfOrigin: '',
  };

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly fieldLabels = FIELD_LABELS;

  protected readonly frontFileName = signal<string | null>(null);
  protected readonly frontPreviewUrl = signal<string | null>(null);
  protected readonly backFileName = signal<string | null>(null);
  protected readonly backPreviewUrl = signal<string | null>(null);
  protected readonly report = signal<VerifyResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private frontImageBase64: string | null = null;
  private backImageBase64: string | null = null;

  constructor(private readonly http: HttpClient) {}

  onFrontFileSelected(event: Event): void {
    this.onFileSelected(event, 'front');
  }

  onBackFileSelected(event: Event): void {
    this.onFileSelected(event, 'back');
  }

  private onFileSelected(event: Event, slot: 'front' | 'back'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      this.error.set('Please select a PNG image.');
      input.value = '';
      return;
    }

    this.error.set(null);
    this.report.set(null);

    const fileNameSignal = slot === 'front' ? this.frontFileName : this.backFileName;
    const previewUrlSignal = slot === 'front' ? this.frontPreviewUrl : this.backPreviewUrl;
    fileNameSignal.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 = reader.result as string;
      if (slot === 'front') {
        this.frontImageBase64 = imageBase64;
      } else {
        this.backImageBase64 = imageBase64;
      }
      previewUrlSignal.set(imageBase64);
    };
    reader.readAsDataURL(file);
  }

  runVerification(): void {
    if (!this.frontImageBase64) {
      this.error.set('Please select a front label image before running the check.');
      return;
    }

    this.error.set(null);
    this.report.set(null);
    this.loading.set(true);

    this.http
      .post<VerifyResponse>(`${environment.api.baseUrl}/verify`, {
        applicationData: this.applicationData,
        frontImageBase64: this.frontImageBase64,
        ...(this.backImageBase64 ? { backImageBase64: this.backImageBase64 } : {}),
      })
      .subscribe({
        next: (response) => {
          this.report.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to verify label.');
          this.loading.set(false);
        },
      });
  }

  print(): void {
    window.print();
  }

  protected statusLabel(status: FieldStatus): string {
    switch (status) {
      case 'match':
        return 'Match';
      case 'mismatch':
        return 'Mismatch';
      case 'needs_review':
        return 'Needs Review';
    }
  }

  protected statusClasses(status: FieldStatus): string {
    switch (status) {
      case 'match':
        return 'bg-green-100 text-green-800';
      case 'mismatch':
        return 'bg-red-100 text-red-800';
      case 'needs_review':
        return 'bg-amber-100 text-amber-800';
    }
  }
}
