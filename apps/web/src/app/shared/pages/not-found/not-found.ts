import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
