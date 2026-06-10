import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AnalyzeImageResponse {
  description: string;
}

@Component({
  selector: 'app-verify',
  imports: [],
  templateUrl: './verify.html',
})
export class Verify {
  protected readonly fileName = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly description = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      this.error.set('Please select a PNG image.');
      input.value = '';
      return;
    }

    this.error.set(null);
    this.description.set(null);
    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 = reader.result as string;
      this.previewUrl.set(imageBase64);
      this.analyzeImage(imageBase64);
    };
    reader.readAsDataURL(file);
  }

  private analyzeImage(imageBase64: string): void {
    this.loading.set(true);
    this.http
      .post<AnalyzeImageResponse>(`${environment.api.baseUrl}/analyze-image`, { imageBase64 })
      .subscribe({
        next: (response) => {
          this.description.set(response.description);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to analyze image.');
          this.loading.set(false);
        },
      });
  }
}
