import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Verify, type VerifyResponse } from './verify';
import { environment } from '../../../environments/environment';

function pngFile(name = 'label.png'): File {
  return new File(['fake-image-bytes'], name, { type: 'image/png' });
}

describe('Verify', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Verify],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('rejects non-PNG files', () => {
    const fixture = TestBed.createComponent(Verify);
    const component = fixture.componentInstance;

    const file = new File(['x'], 'label.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onFrontFileSelected({ target: input } as unknown as Event);

    expect(component['error']()).toContain('PNG');
  });

  it('requires a front image before running verification', () => {
    const fixture = TestBed.createComponent(Verify);
    const component = fixture.componentInstance;

    component.runVerification();

    expect(component['error']()).toContain('front label image');
  });

  it('submits application data and image, and renders the report', async () => {
    const fixture = TestBed.createComponent(Verify);
    const component = fixture.componentInstance;

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [pngFile()] });
    component.onFrontFileSelected({ target: input } as unknown as Event);

    await new Promise((resolve) => setTimeout(resolve, 50));

    component.runVerification();

    const req = httpMock.expectOne(`${environment.api.baseUrl}/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.frontImageBase64).toContain('data:image/png;base64,');

    const response: VerifyResponse = {
      overallStatus: 'mismatch',
      results: [
        { field: 'brandName', applicationValue: 'Old Tom', extractedValue: 'New Tom', status: 'mismatch' },
      ],
    };
    req.flush(response);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Verification Report');
    expect(compiled.textContent).toContain('Mismatch');
  });
});
