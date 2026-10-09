// Endorsements migrated from the legacy CodersTrust WordPress site (post type `endorsements`).
// Quotes are verbatim from the rendered legacy homepage; do not edit wording (a missing space between two sentences is the one repair made).
// Public officials in office (the Danish ambassador, H.E. Winnie Estrup Petersen; James Gardiner of the US Embassy) are not shown as endorsements on evergreen pages;
// the ambassador's entry is removed from this dataset, and the recognition page filters out Gardiner (PA-10: his remarks stay in their dated news item). `date` is null because the
// legacy site does not state when each quote was given (CMS publish dates are not quote dates).
import type { ImageMetadata } from 'astro';
import jamesGardiner from '../assets/images/endorsements/james-gardiner.jpg';
import drJuanCarlosSainzBorgo from '../assets/images/endorsements/dr-juan-carlos-sainz-borgo.jpg';
import melissaMannis from '../assets/images/endorsements/melissa-mannis.jpg';

export interface Endorsement {
  id: string;
  name: string;
  title: string;
  quote: string;
  photo: ImageMetadata;
  photoAlt: string;
  date: string | null;
  legacyUrl: string;
}

export const endorsements: Endorsement[] = [
  {
    id: "james-gardiner",
    name: "James Gardiner",
    title: "Economic Officer, US Embassy",
    quote: "“CodersTrust educates youngsters with the necessary knowledge they need for continuing education skills development and access to digital platforms in the United States for Bangladeshi in the ICT field. The organization aims to foster a global mindset among its students to excel in the ICT sector.”",
    photo: jamesGardiner,
    photoAlt: "Portrait of James Gardiner, Economic Officer, US Embassy",
    date: null,
    legacyUrl: "https://coderstrust.global/endorsements/james-gardiner/",
  },
  {
    id: "dr-juan-carlos-sainz-borgo",
    name: "Dr. Juan Carlos Sainz-Borgo",
    title: "Vice Rector University for Peace, Costa Rica",
    quote: "“Bangladesh it is with great enthusiasm that we the University for Peace celebrate this CodersTrust launch ceremony in Bangladesh with such distinguished guests and of course ambitious and Brilliant young people paving the way for tomorrow. Thank you for your invitation to this extraordinary day and for your admirable and unring commitment to peace and education.",
    photo: drJuanCarlosSainzBorgo,
    photoAlt: "Portrait of Dr. Juan Carlos Sainz-Borgo, Vice Rector University for Peace, Costa Rica",
    date: null,
    legacyUrl: "https://coderstrust.global/endorsements/dr-juan-carlos-sainz-borgo/",
  },
  {
    id: "melissa-mannis",
    name: "Melissa Mannis",
    title: "Special Advisor University for Peace",
    quote: "“On June 3rd here in Costa Rica University for peace and CodersTrust firmed their commitment to working together for peace and education by entering into a memorandum of understanding represents the understanding that skills in peace and in digital technology combined is what is most needed to build the world better for tomorrow and sustainably into the future.”",
    photo: melissaMannis,
    photoAlt: "Portrait of Melissa Mannis, Special Advisor University for Peace",
    date: null,
    legacyUrl: "https://coderstrust.global/endorsements/melissa-mannis/",
  },
];
