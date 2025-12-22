import React, { useContext, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'next-i18next';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Brand from '../../../layout/Brand/Brand';
import Navigation, { NavigationLine } from '../../../layout/Navigation/Navigation';
import User from '../../../layout/User/User';
import {
	componentPagesMenu,
	dashboardPagesMenu,
	demoPagesMenu,
	pageLayoutTypesPagesMenu,
	adminMenu,
	teacherMenu,
	parentMenu,
} from '../../../menu';
import ThemeContext from '../../../context/themeContext';
import Card, { CardBody } from '../../../components/bootstrap/Card';

import Hand from '../../../assets/img/hand.png';
import Icon from '../../../components/icon/Icon';
import Button from '../../../components/bootstrap/Button';
import useDarkMode from '../../../hooks/useDarkMode';
import Aside, { AsideBody, AsideFoot, AsideHead } from '../../../layout/Aside/Aside';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';

const DefaultAside = () => {
	const { asideStatus, setAsideStatus } = useContext(ThemeContext);
	const router = useRouter();
	const { user, role } = useAuth();

	const [doc, setDoc] = useState(
		(typeof window !== 'undefined' &&
			localStorage.getItem('facit_asideDocStatus') === 'true') ||
			false,
	);

	const { t } = useTranslation(['common', 'menu']);

	const { darkModeStatus } = useDarkMode();

	// Determine which menu to show based on the current route and user role
	const isAdminRoute = router.pathname.startsWith('/admin');
	const isTeacherRoute = router.pathname.startsWith('/teacher');
	const isParentRoute = router.pathname.startsWith('/parent');

	// Show role-based menu if user is on a role-specific route
	const showRoleMenu = isAdminRoute || isTeacherRoute || isParentRoute;

	let roleMenu = null;
	if (showRoleMenu) {
		if (isAdminRoute && role === UserRole.SUPER_ADMIN) {
			roleMenu = adminMenu;
		} else if (isTeacherRoute && role === UserRole.TEACHER) {
			roleMenu = teacherMenu;
		} else if (isParentRoute && role === UserRole.PARENT) {
			roleMenu = parentMenu;
		}
	}

	return (
		<Aside>
			<AsideHead>
				<Brand asideStatus={asideStatus} setAsideStatus={setAsideStatus} />
			</AsideHead>
			<AsideBody>
				{roleMenu ? (
					<Navigation menu={roleMenu} id='aside-role-menu' />
				) : (
					<>
						<Navigation menu={dashboardPagesMenu} id='aside-dashboard' />
						{!doc && (
							<>
								<NavigationLine />
								<Navigation menu={demoPagesMenu} id='aside-demo-pages' />
								<NavigationLine />
								<Navigation menu={pageLayoutTypesPagesMenu} id='aside-menu' />
							</>
						)}

						{doc && (
							<>
								<NavigationLine />
								<Navigation menu={componentPagesMenu} id='aside-menu-two' />
								<NavigationLine />
							</>
						)}
					</>
				)}

				{!roleMenu && asideStatus && doc && (
					<Card className='m-3 '>
						<CardBody className='pt-0'>
							<img src={Hand} alt='Hand' width={130} height={130} />
							<p
								className={classNames('h4', {
									'text-dark': !darkModeStatus,
									'text-light': darkModeStatus,
								})}>
								{t('Everything is ready!')}
							</p>
							<Button
								color='info'
								isLight
								className='w-100'
								onClick={() => {
									localStorage.setItem('facit_asideDocStatus', 'false');
									setDoc(false);
								}}>
								{t('Demo Pages')}
							</Button>
						</CardBody>
					</Card>
				)}
			</AsideBody>
			<AsideFoot>
				{!roleMenu && (
					<nav aria-label='aside-bottom-menu'>
						<div className='navigation'>
							<div
								role='presentation'
								className='navigation-item cursor-pointer'
								onClick={() => {
									localStorage.setItem('facit_asideDocStatus', String(!doc));
									setDoc(!doc);
								}}
								data-tour='documentation'>
								<span className='navigation-link navigation-link-pill'>
									<span className='navigation-link-info'>
										<Icon
											icon={doc ? 'ToggleOn' : 'ToggleOff'}
											color={doc ? 'success' : undefined}
											className='navigation-icon'
										/>
										<span className='navigation-text'>
											{t('menu:Documentation')}
										</span>
									</span>
									<span className='navigation-link-extra'>
										<Icon
											icon='Circle'
											className={classNames(
												'navigation-notification',
												'text-success',
												'animate__animated animate__heartBeat animate__infinite animate__slower',
											)}
										/>
									</span>
								</span>
							</div>
						</div>
					</nav>
				)}
				<User />
			</AsideFoot>
		</Aside>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default DefaultAside;
