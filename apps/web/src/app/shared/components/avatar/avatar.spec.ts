import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avatar } from './avatar';

describe('Avatar', () => {
  let component: Avatar;
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Avatar],
    }).compileComponents();

    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', 'Ana Pérez');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the session colors when requested', async () => {
    fixture.componentRef.setInput('tone', 'session');
    await fixture.whenStable();

    const avatar = fixture.nativeElement.querySelector('.avatar') as HTMLElement;
    expect(avatar.classList).toContain('avatar--session');
  });
});
