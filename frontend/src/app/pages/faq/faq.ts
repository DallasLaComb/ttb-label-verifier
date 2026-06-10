import { Component } from '@angular/core';

interface FaqEntry {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  imports: [],
  templateUrl: './faq.html',
})
export class Faq {
  protected readonly entries: FaqEntry[] = [
    {
      question: 'What image formats are supported?',
      answer:
        'Right now only PNG images are accepted. Export or screenshot your label artwork as a PNG before uploading.',
    },
    {
      question: 'What fields does the verifier check?',
      answer:
        'Brand name, class/type designation, alcohol content, net contents, producer name and address, country of origin, and the government warning statement.',
    },
    {
      question: 'How accurate is the extraction?',
      answer:
        'The tool uses an AI vision model to read the label, which is generally accurate for clear, high-resolution images but can struggle with small print, unusual fonts, or low-quality scans. Always review the results yourself.',
    },
    {
      question: 'Is this an official TTB tool?',
      answer:
        'No. TTB Label Verifier is an independent helper and is not affiliated with or endorsed by the Alcohol and Tobacco Tax and Trade Bureau. It does not submit anything to the TTB on your behalf.',
    },
    {
      question: 'Is my label image stored?',
      answer:
        'Uploaded images are sent to the AI provider for analysis and are not stored by this application after the request completes.',
    },
    {
      question: "What does 'needs review' mean?",
      answer:
        'A field is marked "needs review" when the verifier could not confidently read it from the image, or when no value was provided to compare it against.',
    },
  ];
}
