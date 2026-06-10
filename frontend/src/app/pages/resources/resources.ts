import { Component } from '@angular/core';

interface ResourceLink {
  title: string;
  description: string;
  url: string;
}

@Component({
  selector: 'app-resources',
  imports: [],
  templateUrl: './resources.html',
})
export class Resources {
  protected readonly links: ResourceLink[] = [
    {
      title: 'TTB.gov',
      description: 'Home of the Alcohol and Tobacco Tax and Trade Bureau.',
      url: 'https://www.ttb.gov/',
    },
    {
      title: 'COLAs Online',
      description: 'Submit and track Certificate of Label Approval (COLA) applications.',
      url: 'https://ttbonline.gov/colasonline/',
    },
    {
      title: 'Beverage Alcohol Labeling',
      description: 'Mandatory label information requirements for beer, wine, and spirits.',
      url: 'https://www.ttb.gov/labeling',
    },
    {
      title: 'Regulations and Guidance',
      description: 'TTB regulations, rulings, and guidance documents.',
      url: 'https://www.ttb.gov/regulations-and-guidance',
    },
  ];
}
