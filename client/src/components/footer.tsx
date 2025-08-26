export default function Footer() {
  return (
    <footer className="bg-fpl-purple text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4" data-testid="text-footer-title">FPL Dilemmas</h3>
          <p className="text-purple-200 text-sm max-w-2xl mx-auto" data-testid="text-footer-description">
            Advanced analytics and insights for Fantasy Premier League managers. All data sourced from the official Fantasy Premier League API.
          </p>
        </div>
        <div className="border-t border-purple-600 mt-8 pt-8 text-center text-sm text-purple-200">
          <p data-testid="text-contact-info" className="mb-2">
            Contact Admin for new features or bug reports: <a href="mailto:fpldilemmas@gmail.com" className="text-fpl-green hover:underline">fpldilemmas@gmail.com</a> or <a href="https://twitter.com/fpldilemmas" target="_blank" rel="noopener noreferrer" className="text-fpl-green hover:underline">@fpldilemmas</a> on X
          </p>
          <p data-testid="text-copyright">&copy; 2024 FPL Dilemmas. Not affiliated with the Premier League or Fantasy Premier League.</p>
        </div>
      </div>
    </footer>
  );
}
