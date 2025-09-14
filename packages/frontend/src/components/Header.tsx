import type { User } from "../types";

interface HeaderProps {
	user: User;
	onLogout: () => void;
}

export const Header = ({ user, onLogout }: HeaderProps) => {
	return (
		<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<img
						src={user.picture}
						alt="Profile"
						className="w-12 h-12 rounded-full"
					/>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
						<p className="text-gray-600 text-sm">{user.email}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onLogout}
					className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
				>
					Logout
				</button>
			</div>
		</div>
	);
};
