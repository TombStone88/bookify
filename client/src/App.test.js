import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Bookify application without crashing', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/Bookify/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
