import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarList } from './bar-list';

describe('BarList', () => {
  let component: BarList;
  let fixture: ComponentFixture<BarList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarList],
    }).compileComponents();

    fixture = TestBed.createComponent(BarList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
