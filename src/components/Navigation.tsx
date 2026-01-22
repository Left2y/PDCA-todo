'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navigation.css';

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="nav-container">
            <Link
                href="/today"
                className={`nav-link ${pathname === '/today' ? 'active' : ''}`}
            >
                📝 今日
            </Link>
            <Link
                href="/history"
                className={`nav-link ${pathname === '/history' ? 'active' : ''}`}
            >
                📅 历史
            </Link>
            <Link
                href="/settings"
                className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}
            >
                ⚙️ 设置
            </Link>
        </nav>
    );
}
