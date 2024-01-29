import { Component, Input, OnInit } from '@angular/core';
import { ResponseWsl, TopN } from '../ApiResponseWsl';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ResponseFormat } from '../Definitions';

@Component({
  selector: 'app-result-table-wsl',
  templateUrl: './result-table-wsl.component.html',
  styleUrls: ['./result-table-wsl.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ResultTableWslComponent implements OnInit {
  ResponseFormat = ResponseFormat;

  @Input() resultType: keyof TopN = 'by_image';
  @Input() responseData: ResponseWsl | null = null;
  @Input() currentResponseFormat: ResponseFormat = ResponseFormat.None;
  @Input() isRequestedTaxa: boolean = false;

  title: string = "";

  constructor() { }

  ngOnInit() {
    if (this.isRequestedTaxa) {
      this.title = "Requested taxa";
    } else if (this.resultType === 'by_combined') {
      this.title = "Top " + this.responseData?.top_n?.by_combined?.id?.length + " by combined probabilities"
    } else if (this.resultType === 'by_image') {
      this.title = "Top " + this.responseData?.top_n?.by_image?.id?.length + " by image probabilities"
    } else if (this.resultType === 'by_ecology') {
      this.title = "Top " + this.responseData?.top_n?.by_ecology?.id?.length + " by ecological probabilities"
    }
  }

}
