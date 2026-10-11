export interface JobListing {
  id: string;
  companyName: string;
  location: string;
  date: string;
  wage: number;
}

export const MOCK_JOBS: JobListing[] = [
  { id: "1", companyName: "Taj Hotels", location: "Saket, New Delhi", date: "12 July 2024", wage: 500 },
  { id: "2", companyName: "Oberoi Grand", location: "Aerocity, Delhi", date: "13 July 2024", wage: 750 },
  { id: "3", companyName: "ITC Maurya", location: "Chanakyapuri, Delhi", date: "14 July 2024", wage: 600 },
  { id: "4", companyName: "Radisson Blu", location: "Dwarka, Delhi", date: "15 July 2024", wage: 550 },
  { id: "5", companyName: "Leela Palace", location: "Gurugram, HR", date: "16 July 2024", wage: 800 },
  { id: "6", companyName: "Hyatt Regency", location: "Bhikaji Cama, Delhi", date: "17 July 2024", wage: 650 },
  { id: "7", companyName: "Marriott Suites", location: "Cyber City, Gurugram", date: "18 July 2024", wage: 700 },
  { id: "8", companyName: "The Lalit", location: "Connaught Place, Delhi", date: "19 July 2024", wage: 500 },
  { id: "9", companyName: "Crowne Plaza", location: "Mayur Vihar, Delhi", date: "20 July 2024", wage: 550 },
  { id: "10", companyName: "Novotel", location: "Aerocity, Delhi", date: "21 July 2024", wage: 600 },
  { id: "11", companyName: "Westin Hotel", location: "MG Road, Gurugram", date: "22 July 2024", wage: 750 },
  { id: "12", companyName: "Hilton Garden", location: "Baani Square, Gurugram", date: "23 July 2024", wage: 500 },
  { id: "13", companyName: "Pullman Hotel", location: "Asset 2, Aerocity", date: "24 July 2024", wage: 700 },
  { id: "14", companyName: "Roseate House", location: "Hospitality District, Delhi", date: "25 July 2024", wage: 850 },
  { id: "15", companyName: "Trident Hotel", location: "Udyog Vihar, Gurugram", date: "26 July 2024", wage: 650 },
  { id: "16", companyName: "Shangri-La", location: "Ashoka Road, Delhi", date: "27 July 2024", wage: 800 },
  { id: "17", companyName: "Vivanta by Taj", location: "Surajkund, Faridabad", date: "28 July 2024", wage: 550 },
  { id: "18", companyName: "Lemon Tree Premier", location: "Sector 29, Gurugram", date: "29 July 2024", wage: 450 },
  { id: "19", companyName: "Pride Plaza", location: "Hospitality District, Delhi", date: "30 July 2024", wage: 500 },
  { id: "20", companyName: "Grand Hyatt", location: "Vasant Kunj, Delhi", date: "31 July 2024", wage: 750 },
];
