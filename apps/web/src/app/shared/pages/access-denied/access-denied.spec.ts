import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  let component: AccessDenied;
  let fixture: ComponentFixture<AccessDenied>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessDenied],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessDenied);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
