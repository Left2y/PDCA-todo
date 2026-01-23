'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navigation.css';

export default function Navigation() {
    const pathname = usePathname();

    const getActiveIndex = () => {
        if (pathname === '/today') return 0;
        if (pathname === '/weekly') return 1;
        if (pathname === '/history') return 2;
        return 0;
    };

    return (
        <nav className="nav-container">
            <div className="segmented-control">
                <div
                    className="segmented-slider"
                    style={{ transform: `translateX(${getActiveIndex() * 100}%)` }}
                />
                <Link
                    href="/today"
                    className={`nav-link ${pathname === '/today' ? 'active' : ''}`}
                >
                    <span>日计划</span>
                </Link>
                <Link
                    href="/weekly"
                    className={`nav-link ${pathname === '/weekly' ? 'active' : ''}`}
                >
                    <span>周计划</span>
                </Link>
                <Link
                    href="/history"
                    className={`nav-link ${pathname === '/history' ? 'active' : ''}`}
                >
                    <span>历史</span>
                </Link>
            </div>
        </nav>
    );
}
