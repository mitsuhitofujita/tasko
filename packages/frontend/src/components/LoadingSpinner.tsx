interface LoadingSpinnerProps {
	message?: string;
}

export const LoadingSpinner = ({
	message = "Loading...",
}: LoadingSpinnerProps) => {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<p className="text-lg text-gray-600">{message}</p>
		</div>
	);
};
